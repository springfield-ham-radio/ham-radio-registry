import { DefaultNpmClient, type NpmClient } from '../utils/npm-client.js';
import type { RadioCodec, RadioModelId, SharedComponentManager, ValidationResult } from '@springfield/ham-radio-api';
import { readFile, readdir } from 'node:fs/promises';
import { DefaultSharedComponentManager } from './shared-components.js';
import type { ILogLayer } from 'loglayer';
import type { PluginModule } from '../types/plugin-module.js';
import type { RegistryRadio } from '../types/radio-config.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface SpringfieldRadioModuleConfig {
  pluginType: string;
  codecFactory?: string;
  configPath?: string;
  sharedPath?: string;
  manufacturer?: string;
  capabilities?: Record<string, unknown>;
}

export interface PackageJson extends Record<string, unknown> {
  name: string;
  version: string;
  keywords?: string[];
  springfield: SpringfieldRadioModuleConfig;
}

/**
 * Radio configuration registry interface
 */
export interface RadioConfigRegistry {
  // Discover all available radio configurations from npm modules
  discoverConfigurations(): Promise<RegistryRadio[]>;

  // Get configuration by ID
  getConfiguration(configId: string): Promise<RegistryRadio | undefined>;

  // Get configurations by manufacturer
  getConfigurationsByManufacturer(manufacturer: string): Promise<RegistryRadio[]>;

  // Get configurations by module
  getConfigurationsByModule(moduleId: string): Promise<RegistryRadio[]>;

  // Validate configuration
  validateConfiguration(config: RegistryRadio): ValidationResult;

  // Register a new configuration
  registerConfiguration(config: RegistryRadio): Promise<void>;

  // Install and load a new plugin module
  installPlugin(moduleId: string): Promise<void>;

  // List installed plugin modules
  listInstalledPlugins(): Promise<PluginModule[]>;

  // Get codec for a radio model
  getCodec(modelId: RadioModelId): Promise<RadioCodec | undefined>;
}

/**
 * NPM-based configuration registry implementation
 */
export class NpmBasedConfigRegistry implements RadioConfigRegistry {
  private configCache = new Map<string, RegistryRadio>();
  private pluginCache = new Map<string, PluginModule>();
  private codecCache = new Map<string, RadioCodec>();
  private sharedComponentManager: SharedComponentManager;
  private npmClient: NpmClient;
  private logger: ILogLayer;

  constructor(logger: ILogLayer) {
    this.logger = logger;
    this.sharedComponentManager = new DefaultSharedComponentManager(logger);
    this.npmClient = new DefaultNpmClient(logger);
  }

  async discoverConfigurations(): Promise<RegistryRadio[]> {
    const configs: RegistryRadio[] = [];

    // Discover plugin modules from node_modules
    const pluginModules = await this.discoverPluginModules();

    for (const plugin of pluginModules) {
      try {
        const pluginConfigs = await this.loadConfigurationsFromPlugin(plugin);
        configs.push(...pluginConfigs);
      } catch (error) {
        this.logger.withMetadata({ pluignName: plugin.name }).withError(error).warn('Failed to load configurations from plugin ');
      }
    }

    return configs;
  }

  async getConfiguration(configId: string): Promise<RegistryRadio | undefined> {
    // Check cache first
    if (this.configCache.has(configId)) {
      return this.configCache.get(configId);
    }

    // Discover configurations if cache is empty
    if (this.configCache.size === 0) {
      await this.discoverConfigurations();
    }

    return this.configCache.get(configId);
  }

  async getConfigurationsByManufacturer(manufacturer: string): Promise<RegistryRadio[]> {
    const configs = await this.discoverConfigurations();
    return configs.filter((config) => config.id.manufacturer.toLowerCase() === manufacturer.toLowerCase());
  }

  async getConfigurationsByModule(moduleId: string): Promise<RegistryRadio[]> {
    const configs = await this.discoverConfigurations();
    return configs.filter((config) => config.metadata.moduleId === moduleId);
  }

  validateConfiguration(config: RegistryRadio): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!config.id?.model) {
      errors.push('Configuration must have a valid model ID');
    }

    if (!config.serialConfig) {
      errors.push('Configuration must have serial configuration');
    }

    if (!config.memoryConfig) {
      errors.push('Configuration must have memory configuration');
    }

    if (!config.readMemory || config.readMemory.length === 0) {
      errors.push('Configuration must have read memory protocol');
    }

    if (!config.writeMemory || config.writeMemory.length === 0) {
      errors.push('Configuration must have write memory protocol');
    }

    // Schema validation
    if (!config.settingsSchema) {
      errors.push('Configuration must have settings schema');
    }

    return {
      errors,
      isValid: errors.length === 0,
      warnings,
    };
  }

  async registerConfiguration(config: RegistryRadio): Promise<void> {
    const validation = this.validateConfiguration(config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    this.configCache.set(config.id.model, config);
    this.logger.withMetadata({ modelId: config.id.model }).info('Registered configuration');
  }

  async installPlugin(moduleId: string): Promise<void> {
    // Validate plugin before installation
    const validation = await this.validatePlugin(moduleId);
    if (!validation.isValid) {
      throw new Error(`Plugin validation failed: ${validation.errors.join(', ')}`);
    }

    // Install using yarn
    await this.runPackageManager(['add', moduleId]);

    // Refresh configuration registry
    await this.discoverConfigurations();

    this.logger.withMetadata({ moduleId }).info('Installed plugin');
  }

  async listInstalledPlugins(): Promise<PluginModule[]> {
    return [...this.pluginCache.values()];
  }

  async getCodec(modelId: RadioModelId): Promise<RadioCodec | undefined> {
    // Check cache first
    if (this.codecCache.has(modelId)) {
      return this.codecCache.get(modelId);
    }

    // Find configuration for this model
    const config = await this.getConfiguration(modelId);
    if (!config || !config.codec) {
      return undefined;
    }

    // Load codec based on configuration
    const codec = await this.loadCodecFromConfig(config);
    if (codec) {
      this.codecCache.set(modelId, codec);
    }

    return codec;
  }

  private async discoverPluginModules(): Promise<PluginModule[]> {
    const plugins: PluginModule[] = [];

    // Scan node_modules for radio modules
    const nodeModulesPath = join(process.cwd(), 'node_modules');

    if (!existsSync(nodeModulesPath)) {
      return plugins;
    }

    const entries = await readdir(nodeModulesPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith('@')) {
          // Handle scoped packages
          await this.processScopedPackage(nodeModulesPath, entry.name, plugins);
        } else {
          // Handle regular packages
          await this.processRegularPackage(nodeModulesPath, entry.name, plugins);
        }
      }
    }

    return plugins;
  }

    private async processScopedPackage(nodeModulesPath: string, scopeName: string, plugins: PluginModule[]): Promise<void> {
    // First, try to process the scoped directory as a package itself
    // (some scoped packages like @types/node have their own package.json)
    const scopePackageJsonPath = join(nodeModulesPath, scopeName, 'package.json');

    try {
      if (existsSync(scopePackageJsonPath)) {
        // The scoped directory itself is a package
        await this.processRegularPackage(nodeModulesPath, scopeName, plugins);
        return; // Don't scan subdirectories if this is a package itself
      }
    } catch (error) {
      // If processing as a package fails, continue to scan subdirectories
      this.logger.withMetadata({ error, scopeName }).debug('Scoped directory is not a package, scanning subdirectories');
    }

    // If the scoped directory is not a package itself, scan for sub-packages
    try {
      const scopePath = join(nodeModulesPath, scopeName);
      const scopedEntries = await readdir(scopePath, { withFileTypes: true });

      for (const scopedEntry of scopedEntries) {
        if (scopedEntry.isDirectory()) {
          const fullPackageName = `${scopeName}/${scopedEntry.name}`;
          await this.processRegularPackage(nodeModulesPath, fullPackageName, plugins);
        }
      }
    } catch (error) {
      // Skip invalid scoped packages
      this.logger.withError(error).withMetadata({ scopeName }).trace('Skipped invalid scoped package directory');
    }
  }

  private async processRegularPackage(nodeModulesPath: string, packageName: string, plugins: PluginModule[]): Promise<void> {
    const packageJsonPath = join(nodeModulesPath, packageName, 'package.json');

    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));

      // Check if this is a radio module
      if (this.isRadioModule(packageJson)) {
        const plugin = await this.loadPluginModule(packageName, packageJson);
        plugins.push(plugin);
        this.pluginCache.set(packageName, plugin);
      }
    } catch (error) {
      // Skip invalid packages
      this.logger.withError(error).withMetadata({ packageName }).trace('Skipped invalid package');
    }
  }

  private isRadioModule(packageJson: PackageJson): boolean {
    const name = packageJson.name || '';

    // Check naming convention
    const isNamedCorrectly = name.includes('radio-module') || name.startsWith('@springfield/radio-module-');

    // Check springfield plugin field
    const hasSpringfieldField = packageJson.springfield?.pluginType === 'radio-module';

    // Check keywords
    const hasKeywords = packageJson.keywords?.includes('radio-module') ?? false;

    return isNamedCorrectly || hasSpringfieldField || hasKeywords;
  }

  private async loadPluginModule(moduleName: string, packageJson: PackageJson): Promise<PluginModule> {
    const modulePath = join(process.cwd(), 'node_modules', moduleName);
    const springfieldConfig = packageJson.springfield|| {};

    return {
      capabilities: springfieldConfig.capabilities || {},
      codecFactoryPath: springfieldConfig.codecFactory ? join(modulePath, springfieldConfig.codecFactory) : undefined,
      configPath: join(modulePath, springfieldConfig.configPath || 'configs'),
      manufacturer: springfieldConfig.manufacturer,
      name: moduleName,
      packageJson,
      sharedPath: join(modulePath, springfieldConfig.sharedPath || 'shared'),
      version: packageJson.version,
    } as PluginModule;
  }

  private async loadConfigurationsFromPlugin(plugin: PluginModule): Promise<RegistryRadio[]> {
    const configs: RegistryRadio[] = [];

    try {
      const configFiles = await this.findConfigFiles(plugin.configPath);

      for (const configFile of configFiles) {
        try {
          const config = await this.loadConfiguration(configFile);

          // Resolve shared component references
          await this.resolveSharedComponents(config, plugin);

          // Add plugin metadata
          config.metadata = {
            ...config.metadata,
            moduleId: plugin.name,
            moduleVersion: plugin.version,
            pluginPath: plugin.configPath,
          };

          if (this.validateConfiguration(config).isValid) {
            configs.push(config);
            this.configCache.set(config.id.model, config);
          }
        } catch (error) {
          this.logger.withError(error).warn(`Failed to load configuration from ${configFile}:`);
        }
      }
    } catch (error) {
      this.logger.withError(error).warn(`Failed to access plugin directory ${plugin.configPath}:`);
    }

    return configs;
  }

  private async findConfigFiles(configPath: string): Promise<string[]> {
    if (!existsSync(configPath)) {
      return [];
    }

    const files = await readdir(configPath);
    return files.filter((file) => file.endsWith('.json')).map((file) => join(configPath, file));
  }

  private async loadConfiguration(configFile: string): Promise<RegistryRadio> {
    const content = await readFile(configFile, 'utf8');
    return JSON.parse(content);
  }

  private async resolveSharedComponents(config: RegistryRadio, plugin: PluginModule): Promise<void> {
    // Resolve schema references
    if (config.settingsSchema.settingsSchema && typeof config.settingsSchema.settingsSchema === 'object' && '$ref' in config.settingsSchema.settingsSchema) {
      const schemaPath = this.sharedComponentManager.resolveReference(config.settingsSchema.settingsSchema.$ref as string, plugin.configPath);
      config.settingsSchema.settingsSchema = await this.sharedComponentManager.loadSchema(schemaPath);
    }

    if (config.settingsSchema.channelSchema && typeof config.settingsSchema.channelSchema === 'object' && '$ref' in config.settingsSchema.channelSchema) {
      const schemaPath = this.sharedComponentManager.resolveReference(config.settingsSchema.channelSchema.$ref as string, plugin.configPath);
      config.settingsSchema.channelSchema = await this.sharedComponentManager.loadSchema(schemaPath);
    }
  }

  private async loadCodecFromConfig(config: RegistryRadio): Promise<RadioCodec | undefined> {
    if (!config.codec || config.codec.type !== 'shared' || !config.codec.reference) {
      return undefined;
    }

    const codecPath = this.sharedComponentManager.resolveReference(config.codec.reference, config.metadata.pluginPath || '');

    return this.sharedComponentManager.loadCodec(codecPath, {
      modelId: config.id.model,
      ...config.codec.config,
    });
  }

  private async validatePlugin(moduleId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get package info from npm registry
      const packageInfo = await this.npmClient.getPackageInfo(moduleId);

      // Check if it's a radio module
      if (!this.isRadioModule(packageInfo)) {
        errors.push('Package is not a radio module');
      }

      // Check version compatibility
      if (!this.isVersionCompatible()) {
        errors.push('Module version is not compatible with current system');
      }
    } catch (error) {
      errors.push(`Failed to validate plugin: ${error}`);
    }

    return {
      errors,
      isValid: errors.length === 0,
      warnings,
    };
  }

  private isVersionCompatible(): boolean {
    // Basic version compatibility check
    // Could be enhanced with semver validation
    return true;
  }

  private async runPackageManager(args: string[]): Promise<void> {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    try {
      await execAsync(`yarn ${args.join(' ')}`);
    } catch (error) {
      throw new Error(`Package manager error: ${error}`);
    }
  }
}
