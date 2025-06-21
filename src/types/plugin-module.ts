/**
 * Plugin module capabilities
 */
export interface PluginCapabilities {
  dslProtocols: boolean;
  customCodecs: boolean;
  memoryRead: boolean;
  memoryWrite: boolean;
  sharedComponents: boolean;
}

/**
 * Springfield-specific plugin configuration in package.json
 */
export interface SpringfieldPluginConfig {
  pluginType: 'radio-module';
  version: string;
  manufacturer: string;
  supportedRadios: string[];
  capabilities: PluginCapabilities;
  configPath: string;
  sharedPath: string;
  codecFactory?: string;
}

/**
 * Plugin module information
 */
export interface PluginModule {
  name: string;
  version: string;
  manufacturer?: string;
  configPath: string;
  sharedPath: string;
  codecFactoryPath?: string;
  capabilities: Record<string, boolean>;
  packageJson: any;
}

/**
 * NPM plugin information from registry
 */
export interface NpmPluginInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  repository?: string;
  downloads: number;
  lastUpdated: string;
  springfield?: SpringfieldPluginConfig;
}

/**
 * Plugin manifest configuration
 */
export interface PluginManifest {
  pluginType: 'radio-module';
  version: string;
  manufacturer: string;
  author: string;
  license: string;
  repository?: string;
  configurations: PluginManifestConfiguration[];
  sharedComponents?: PluginSharedComponents;
  security?: PluginSecurity;
}

/**
 * Plugin manifest configuration entry
 */
export interface PluginManifestConfiguration {
  id: string;
  name: string;
  file: string;
  description: string;
  usesSharedComponents?: string[];
}

/**
 * Plugin shared components
 */
export interface PluginSharedComponents {
  schemas?: Record<string, string>;
  protocols?: Record<string, string>;
  codecs?: Record<string, string>;
}

/**
 * Plugin security information
 */
export interface PluginSecurity {
  signature?: string;
  checksum?: string;
}
