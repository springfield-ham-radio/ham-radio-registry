# Radio Configuration Discovery Mechanism - Revised Architecture

## Overview

This proposal outlines a new architecture for discovering and using radio configurations from plugin modules distributed via npm. The current `RadioModule` system has several architectural issues that this proposal addresses with a cleaner, more focused approach that supports third-party configuration providers.

## Problems with Current Architecture

### 1. Mixed Responsibilities
- `RadioModule` interface mixes radio discovery with driver provisioning
- Modules are responsible for both providing radio metadata AND implementing drivers
- No clear separation between configuration discovery and runtime execution

### 2. Tight Coupling
- UI directly instantiates specific module classes (`new BaofengModule(logger)`)
- Hardcoded dependencies make the system inflexible
- Modules must implement complex interfaces that may not be needed

### 3. Configuration Scattered
- DSL configurations are embedded in base code rather than with their modules
- Radio metadata is duplicated between module implementations and DSL configs
- No single source of truth for radio capabilities

### 4. Discovery Complexity
- No standard way to discover available modules
- Module loading requires knowledge of specific module classes
- No validation or versioning of module capabilities

### 5. Third-Party Distribution
- No mechanism for third-party npm modules to provide radio configurations
- No standards for plugin identification and discovery
- Security concerns with loading third-party configurations

### 6. Codec and Shared Component Management
- No mechanism for sharing codecs across related radio models
- No way to share schemas and protocols between models from same manufacturer
- Duplication of common components across radio models

## Proposed New Architecture

### 1. NPM Module Distribution Strategy

Radio modules will be distributed as npm modules with a standardized structure that supports both individual radio configurations and shared components:

```
@springfield/radio-module-baofeng/
├── package.json
├── configs/                    # Radio configuration files (one per model)
│   ├── uv5r.json              # Complete configuration for UV-5R
│   ├── uv5r-plus.json         # Complete configuration for UV-5R Plus
│   └── uv82.json              # Complete configuration for UV-82
├── shared/                     # Shared components across models
│   ├── schemas/                # Shared schemas
│   │   ├── channel-schema.json
│   │   └── settings-schema.json
│   ├── protocols/              # Shared protocol patterns
│   │   ├── handshake.json
│   │   └── memory-access.json
│   └── codecs/                 # Shared codec implementations
│       ├── baofeng-codec.ts
│       ├── baofeng-decoder.ts
│       └── baofeng-encoder.ts
├── src/                        # Module source code
│   ├── index.ts                # Main module entry point
│   ├── codec-factory.ts        # Codec factory for the module
│   └── shared-components.ts    # Shared component loader
└── README.md
```

### 2. Package.json Plugin Identification

Use a combination of naming convention and package.json fields to identify radio modules:

#### 2.1 Naming Convention
- **Official modules**: `@springfield/radio-module-{manufacturer}`
- **Third-party modules**: `radio-module-{manufacturer}` or `@scope/radio-module-{manufacturer}`

#### 2.2 Package.json Fields
Add specific fields to identify and configure radio modules:

```json
{
  "name": "@springfield/radio-module-baofeng",
  "version": "1.0.0",
  "description": "Radio module for Baofeng UV-5R series",
  "keywords": ["ham-radio", "radio-module", "baofeng"],
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "springfield": {
    "pluginType": "radio-module",
    "version": "1.0.0",
    "manufacturer": "Baofeng",
    "supportedRadios": ["uv5r", "uv5r-plus", "uv82"],
    "capabilities": {
      "dslProtocols": true,
      "customCodecs": true,
      "memoryRead": true,
      "memoryWrite": true,
      "sharedComponents": true
    },
    "configPath": "configs",
    "sharedPath": "shared",
    "codecFactory": "src/codec-factory.ts"
  },
  "files": [
    "configs/",
    "shared/",
    "dist/"
  ],
  "peerDependencies": {
    "@springfield/ham-radio-api": "^12.0.0"
  },
  "dependencies": {
    "@springfield/ham-radio-driver-utils": "^7.1.0",
    "loglayer": "^6.4.2"
  }
}
```

#### 2.3 Alternative: Plugin Manifest
For more complex plugins, support a separate manifest file:

```json
// plugin-manifest.json
{
  "pluginType": "radio-module",
  "version": "1.0.0",
  "manufacturer": "Baofeng",
  "author": "Springfield Ham Radio",
  "license": "MIT",
  "repository": "https://github.com/springfield-ham-radio/radio-module-baofeng",
  "configurations": [
    {
      "id": "baofeng-uv5r",
      "name": "Baofeng UV-5R",
      "file": "configs/uv5r.json",
      "description": "UV-5R and UV-5RE Plus models",
      "usesSharedComponents": ["channel-schema", "baofeng-codec"]
    }
  ],
  "sharedComponents": {
    "schemas": {
      "channel-schema": "shared/schemas/channel-schema.json",
      "settings-schema": "shared/schemas/settings-schema.json"
    },
    "protocols": {
      "handshake": "shared/protocols/handshake.json",
      "memory-access": "shared/protocols/memory-access.json"
    },
    "codecs": {
      "baofeng-codec": "shared/codecs/baofeng-codec.ts"
    }
  },
  "security": {
    "signature": "sha256:...",
    "checksum": "sha256:..."
  }
}
```

### 3. Enhanced Configuration Schema

Each radio model will have a configuration file that can reference shared components:

```json
{
  "$schema": "https://springfield-ham-radio.com/schemas/radio-config-v1.json",
  "id": {
    "model": "baofeng-uv5r",
    "name": "Baofeng UV-5R",
    "manufacturer": "Baofeng"
  },
  "version": "1.0.0",
  "description": "UV-5R and UV-5RE Plus models",
  "capabilities": {
    "memoryRead": true,
    "memoryWrite": true,
    "channelProgramming": true,
    "settingsProgramming": true
  },
  "serialConfig": {
    "baudRate": 9600,
    "dataBits": 8,
    "stopBits": 1,
    "parity": "none"
  },
  "memoryConfig": {
    "chunkSize": 64,
    "segments": {
      "channels": {
        "startAddress": 0,
        "endAddress": 6143,
        "description": "Channel memory"
      },
      "settings": {
        "startAddress": 7872,
        "endAddress": 8191,
        "description": "Radio settings"
      }
    }
  },
  "readMemory": [
    {
      "sendReceive": {
        "send": [80, 187, 255, 32, 18, 7, 37],
        "receive": {
          "type": "exact",
          "value": 6,
          "length": 1
        },
        "description": "Send magic number"
      }
    },
    {
      "sendReceive": {
        "send": [2],
        "receive": {
          "type": "variable",
          "length": 8
        },
        "description": "Get radio identifier"
      }
    },
    {
      "readSegment": {
        "segments": ["channels", "settings"],
        "startChunk": {
          "send": ["S", "address:2", "segment.chunkSize"],
          "receive": {
            "type": "pattern",
            "pattern": [
              "X",
              {
                "field": "address",
                "size": 2
              },
              {
                "field": "length",
                "size": 1
              },
              {
                "field": "data",
                "size": 0
              }
            ]
          }
        },
        "endChunk": {
          "send": [6],
          "receive": {
            "type": "exact",
            "value": 6,
            "length": 1
          }
        },
        "description": "Read all memory segments (single chunk per segment)"
      }
    }
  ],
  "writeMemory": [
    {
      "sendReceive": {
        "send": [80, 187, 255, 32, 18, 7, 37],
        "receive": {
          "type": "exact",
          "value": 6,
          "length": 1
        },
        "description": "Send magic number"
      }
    },
    {
      "writeSegment": {
        "segments": ["channels", "settings"],
        "send": ["X", "segment.startAddress:2", "segment.chunkSize"],
        "data": "segment.data",
        "receive": {
          "type": "exact",
          "value": 6,
          "length": 1
        },
        "description": "Write all memory segments (single chunk per segment)"
      }
    }
  ],
  "settingsSchema": {
    "model": "baofeng-uv5r",
    "settingsSchema": {
      "$ref": "shared/schemas/settings-schema.json"
    },
    "channelSchema": {
      "$ref": "shared/schemas/channel-schema.json"
    }
  },
  "codec": {
    "type": "shared",
    "reference": "shared/codecs/baofeng-codec.ts",
    "config": {
      "channelSize": 16,
      "magicNumber": [80, 187, 255, 32, 18, 7, 37],
      "powerOffset": 14,
      "receiveFrequencyOffset": 0,
      "receiveToneOffset": 8,
      "transmitFrequencyOffset": 4,
      "transmitToneOffset": 10
    }
  },
  "metadata": {
    "moduleId": "@springfield/radio-module-baofeng",
    "moduleVersion": "1.0.0",
    "lastUpdated": "2024-01-15T10:30:00Z",
    "author": "Springfield Ham Radio",
    "license": "MIT"
  }
}
```

### 4. Codec Factory Pattern

Implement a codec factory to create codecs for radio models:

```typescript
// src/codec-factory.ts
import type { RadioCodec, RadioModelId } from '@springfield/ham-radio-api';
import type { ILogLayer } from 'loglayer';
import { BaofengCodec } from '../shared/codecs/baofeng-codec.js';

export interface CodecFactory {
  createCodec(modelId: RadioModelId, config: any, logger: ILogLayer): Promise<RadioCodec>;
}

export class BaofengCodecFactory implements CodecFactory {
  async createCodec(modelId: RadioModelId, config: any, logger: ILogLayer): Promise<RadioCodec> {
    // Create appropriate codec based on model and configuration
    return new BaofengCodec(modelId, config, logger);
  }
}

// Module entry point
export { BaofengCodecFactory as CodecFactory };
```

### 5. Shared Components Management

Create a system for managing shared components:

```typescript
interface SharedComponentManager {
  // Load shared schema
  loadSchema(schemaPath: string): Promise<any>;

  // Load shared protocol
  loadProtocol(protocolPath: string): Promise<any>;

  // Load shared codec
  loadCodec(codecPath: string, config: any): Promise<RadioCodec>;

  // Resolve component references
  resolveReference(reference: string, basePath: string): string;
}

class DefaultSharedComponentManager implements SharedComponentManager {
  async loadSchema(schemaPath: string): Promise<any> {
    // Load and validate schema
    const schema = await this.loadFile(schemaPath);
    return this.validateSchema(schema);
  }

  async loadProtocol(protocolPath: string): Promise<any> {
    // Load and validate protocol
    const protocol = await this.loadFile(protocolPath);
    return this.validateProtocol(protocol);
  }

  async loadCodec(codecPath: string, config: any): Promise<RadioCodec> {
    // Dynamically load codec module
    const codecModule = await import(codecPath);
    const CodecFactory = codecModule.CodecFactory;

    const factory = new CodecFactory();
    return factory.createCodec(config.modelId, config, this.logger);
  }

  resolveReference(reference: string, basePath: string): string {
    if (reference.startsWith('shared/')) {
      return path.join(basePath, reference);
    }
    return reference;
  }
}
```

### 6. Enhanced NPM-Aware Configuration Registry

Update the registry to handle shared components:

```typescript
interface RadioConfigRegistry {
  // Discover all available radio configurations from npm modules
  discoverConfigurations(): Promise<RadioConfiguration[]>;

  // Get configuration by ID
  getConfiguration(configId: string): Promise<RadioConfiguration | null>;

  // Get configurations by manufacturer
  getConfigurationsByManufacturer(manufacturer: string): Promise<RadioConfiguration[]>;

  // Get configurations by module
  getConfigurationsByModule(moduleId: string): Promise<RadioConfiguration[]>;

  // Validate configuration
  validateConfiguration(config: RadioConfiguration): ValidationResult;

  // Register a new configuration
  registerConfiguration(config: RadioConfiguration): Promise<void>;

  // Install and load a new plugin module
  installPlugin(moduleId: string): Promise<void>;

  // List installed plugin modules
  listInstalledPlugins(): Promise<PluginModule[]>;

  // Get codec for a radio model
  getCodec(modelId: RadioModelId): Promise<RadioCodec | null>;
}

class NpmBasedConfigRegistry implements RadioConfigRegistry {
  private configCache = new Map<string, RadioConfiguration>();
  private pluginCache = new Map<string, PluginModule>();
  private codecCache = new Map<string, RadioCodec>();
  private sharedComponentManager: SharedComponentManager;

  constructor() {
    this.sharedComponentManager = new DefaultSharedComponentManager();
  }

  async discoverConfigurations(): Promise<RadioConfiguration[]> {
    const configs: RadioConfiguration[] = [];

    // Discover plugin modules from node_modules
    const pluginModules = await this.discoverPluginModules();

    for (const plugin of pluginModules) {
      try {
        const pluginConfigs = await this.loadConfigurationsFromPlugin(plugin);
        configs.push(...pluginConfigs);
      } catch (error) {
        console.warn(`Failed to load configurations from plugin ${plugin.name}:`, error);
      }
    }

    return configs;
  }

  async getCodec(modelId: RadioModelId): Promise<RadioCodec | null> {
    // Check cache first
    if (this.codecCache.has(modelId)) {
      return this.codecCache.get(modelId)!;
    }

    // Find configuration for this model
    const config = await this.getConfiguration(modelId);
    if (!config || !config.codec) {
      return null;
    }

    // Load codec based on configuration
    const codec = await this.loadCodecFromConfig(config);
    if (codec) {
      this.codecCache.set(modelId, codec);
    }

    return codec;
  }

  private async loadCodecFromConfig(config: RadioConfiguration): Promise<RadioCodec | null> {
    if (config.codec.type === 'shared') {
      const codecPath = this.sharedComponentManager.resolveReference(
        config.codec.reference,
        config.metadata.pluginPath
      );
      return this.sharedComponentManager.loadCodec(codecPath, config.codec.config);
    }

    return null;
  }

  private async loadConfigurationsFromPlugin(plugin: PluginModule): Promise<RadioConfiguration[]> {
    const configs: RadioConfiguration[] = [];

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
            pluginPath: plugin.configPath
          };

          if (this.validateConfiguration(config).isValid) {
            configs.push(config);
            this.configCache.set(config.id.model, config);
          }
        } catch (error) {
          console.warn(`Failed to load configuration from ${configFile}:`, error);
        }
      }
    } catch (error) {
      console.warn(`Failed to access plugin directory ${plugin.configPath}:`, error);
    }

    return configs;
  }

  private async resolveSharedComponents(config: RadioConfiguration, plugin: PluginModule): Promise<void> {
    // Resolve schema references
    if (config.settingsSchema.settingsSchema.$ref) {
      const schemaPath = this.sharedComponentManager.resolveReference(
        config.settingsSchema.settingsSchema.$ref,
        plugin.configPath
      );
      config.settingsSchema.settingsSchema = await this.sharedComponentManager.loadSchema(schemaPath);
    }

    if (config.settingsSchema.channelSchema.$ref) {
      const schemaPath = this.sharedComponentManager.resolveReference(
        config.settingsSchema.channelSchema.$ref,
        plugin.configPath
      );
      config.settingsSchema.channelSchema = await this.sharedComponentManager.loadSchema(schemaPath);
    }
  }
}

interface PluginModule {
  name: string;
  version: string;
  manufacturer?: string;
  configPath: string;
  sharedPath: string;
  codecFactoryPath?: string;
  capabilities: Record<string, boolean>;
  packageJson: any;
}
```

### 7. Plugin Management Service

Update the plugin manager to handle radio modules:

```typescript
interface PluginManager {
  // Install a radio module
  installPlugin(moduleId: string): Promise<void>;

  // Uninstall a plugin
  uninstallPlugin(moduleId: string): Promise<void>;

  // Update a plugin
  updatePlugin(moduleId: string): Promise<void>;

  // List available plugins from npm registry
  searchPlugins(query?: string): Promise<NpmPluginInfo[]>;

  // Get plugin information
  getPluginInfo(moduleId: string): Promise<NpmPluginInfo | null>;

  // Validate plugin before installation
  validatePlugin(moduleId: string): Promise<ValidationResult>;
}

class DefaultPluginManager implements PluginManager {
  async validatePlugin(moduleId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get package info from npm registry
      const packageInfo = await this.getPackageInfo(moduleId);

      // Check if it's a radio module
      if (!this.isRadioModule(packageInfo)) {
        errors.push('Package is not a radio module');
      }

      // Check version compatibility
      if (!this.isVersionCompatible(packageInfo)) {
        errors.push('Module version is not compatible with current system');
      }

      // Check for security issues (optional)
      const securityIssues = await this.checkSecurityIssues(moduleId);
      if (securityIssues.length > 0) {
        warnings.push(`Security issues found: ${securityIssues.join(', ')}`);
      }

    } catch (error) {
      errors.push(`Failed to validate plugin: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private isRadioModule(packageInfo: any): boolean {
    // Check naming convention
    const name = packageInfo.name || '';
    const isNamedCorrectly = name.includes('radio-module') ||
                            name.startsWith('@springfield/radio-module-');

    // Check springfield plugin field
    const hasSpringfieldField = packageInfo.springfield?.pluginType === 'radio-module';

    // Check keywords
    const hasKeywords = packageInfo.keywords?.includes('radio-module');

    return isNamedCorrectly || hasSpringfieldField || hasKeywords;
  }
}

interface NpmPluginInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  repository?: string;
  downloads: number;
  lastUpdated: string;
  springfield?: {
    pluginType: string;
    manufacturer: string;
    supportedRadios: string[];
  };
}
```

### 8. UI Integration with Module Management

Update the UI to support module management:

```typescript
export const useRadioStore = defineStore("radio-modules", () => {
  const configurations = ref<RadioConfiguration[]>([]);
  const installedModules = ref<PluginModule[]>([]);
  const registry = new NpmBasedConfigRegistry();
  const pluginManager = new DefaultPluginManager();

  const initialize = async () => {
    configurations.value = await registry.discoverConfigurations();
    installedModules.value = await registry.listInstalledPlugins();
  };

  const installModule = async (moduleId: string) => {
    await pluginManager.installPlugin(moduleId);
    await initialize(); // Refresh configurations
  };

  const uninstallModule = async (moduleId: string) => {
    await pluginManager.uninstallPlugin(moduleId);
    await initialize(); // Refresh configurations
  };

  const searchModules = async (query?: string) => {
    return pluginManager.searchPlugins(query);
  };

  const getCodec = async (modelId: RadioModelId) => {
    return registry.getCodec(modelId);
  };

  return {
    configurations,
    installedModules,
    initialize,
    installModule,
    uninstallModule,
    searchModules,
    getCodec
  };
});
```

### 9. Security Considerations

#### 9.1 Module Validation
- Validate module package.json before installation
- Check for required fields and proper structure
- Verify module type and capabilities

#### 9.2 Code Validation
- Validate TypeScript/JavaScript code before execution
- Check for malicious code patterns
- Sandbox codec execution

#### 9.3 Configuration Validation
- Validate all configuration files against schemas
- Check for malicious content in configuration files
- Verify file paths and references

#### 9.4 Sandboxing
- Load codecs in a sandboxed environment
- Validate all file system access
- Prevent execution of arbitrary code

#### 9.5 Signature Verification
- Support for signed modules (optional)
- Checksum verification for all files
- Tamper detection

### 10. Third-Party Module Guidelines

#### 10.1 Naming Conventions
- Use `radio-module-{manufacturer}` or `@scope/radio-module-{manufacturer}`
- Include `radio-module` in keywords
- Add `springfield.pluginType: "radio-module"` to package.json

#### 10.2 Required Structure
```
radio-module-manufacturer/
├── package.json
├── configs/              # One configuration file per radio model
│   ├── model1.json      # Complete configuration with shared references
│   └── model2.json      # Complete configuration with shared references
├── shared/               # Shared components
│   ├── schemas/          # Shared schemas
│   ├── protocols/        # Shared protocols
│   └── codecs/           # Shared codecs
├── src/                  # Module source code
│   ├── index.ts          # Main entry point
│   └── codec-factory.ts  # Codec factory
└── README.md
```

#### 10.3 Package.json Requirements
```json
{
  "name": "radio-module-manufacturer",
  "keywords": ["ham-radio", "radio-module"],
  "springfield": {
    "pluginType": "radio-module",
    "manufacturer": "Manufacturer Name"
  },
  "peerDependencies": {
    "@springfield/ham-radio-api": "^12.0.0"
  }
}
```

## Benefits of New Architecture

### 1. **NPM Ecosystem Integration**
- Leverages existing npm infrastructure
- Easy distribution and updates
- Version management and dependency resolution

### 2. **Third-Party Support**
- Clear guidelines for third-party developers
- Standardized module structure
- Security validation and sandboxing

### 3. **Discoverability**
- Automatic discovery of installed modules
- Search functionality for available modules
- Clear identification of radio modules

### 4. **Flexibility**
- Support for both official and third-party modules
- Easy to add new radio configurations
- Module management and updates

### 5. **Security**
- Validation of module packages
- Sandboxed codec loading
- Tamper detection and prevention

### 6. **Shared Components**
- Codecs can be shared across related radio models
- Schemas and protocols can be reused
- Reduces duplication and maintenance overhead

### 7. **Codec Support**
- Modules can provide custom codec implementations
- Codec factory pattern for flexible codec creation
- Support for both shared and model-specific codecs

### 8. **Modularity**
- Clear separation between configurations and code
- Shared components reduce duplication
- Easy to maintain and update

## Migration Strategy

### Phase 1: Infrastructure
1. Implement `NpmBasedConfigRegistry` and `PluginManager`
2. Create shared component management system
3. Implement codec factory pattern
4. Move existing DSL configs to npm module format

### Phase 2: Module System
1. Create official radio modules with shared components
2. Update UI to support module management
3. Test with existing radio configurations

### Phase 3: Third-Party Support
1. Publish module development guidelines
2. Create module templates and examples
3. Establish module repository and discovery

## Implementation Considerations

### 1. **Package Manager Integration**
- Support for both npm and yarn
- Handle package manager conflicts
- Manage peer dependencies

### 2. **Performance**
- Module discovery caching
- Lazy loading of configurations and codecs
- Efficient file system scanning

### 3. **Error Handling**
- Graceful handling of invalid modules
- Detailed error messages for debugging
- Fallback mechanisms for missing components

### 4. **Updates and Maintenance**
- Module update notifications
- Automatic dependency updates
- Module compatibility checking

### 5. **Code Security**
- Code validation and sandboxing
- Malicious code detection
- Safe codec execution

## Future Enhancements

### 1. **Module Repository**
- Central repository for radio modules
- Module ratings and reviews
- Automatic module recommendations

### 2. **Module Marketplace**
- Web interface for module discovery
- Module installation from UI
- Module management dashboard

### 3. **Advanced Module Features**
- Module dependencies and conflicts
- Module composition and inheritance
- Custom module types beyond radio configurations

### 4. **Codec Ecosystem**
- Codec sharing and reuse
- Codec versioning and compatibility
- Community-contributed codecs

## Conclusion

This npm-based architecture provides a robust foundation for third-party radio module distribution while maintaining security and discoverability. The combination of naming conventions, package.json fields, and module validation ensures that radio modules can be easily identified, installed, and managed within the existing npm ecosystem.

The architecture supports shared components across radio models from the same manufacturer, provides codec support through a factory pattern, and includes comprehensive security measures to protect users from malicious modules. The unified configuration format with shared component references provides flexibility while maintaining simplicity for third-party developers.

The architecture supports both official and third-party modules, provides clear guidelines for module development, and includes comprehensive security measures to protect users from malicious modules.
