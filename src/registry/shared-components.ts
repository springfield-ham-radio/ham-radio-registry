import type { RadioCodec, SharedComponentManager } from '@springfield/ham-radio-api';
import type { ILogLayer } from 'loglayer';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

/**
 * Default implementation of the shared component manager
 */
export class DefaultSharedComponentManager implements SharedComponentManager {
  private logger: ILogLayer;

  constructor(logger: ILogLayer) {
    this.logger = logger;
  }

  async loadSchema(schemaPath: string): Promise<Record<string, unknown>> {
    try {
      const content = await readFile(schemaPath, 'utf8');
      const schema = JSON.parse(content);

      this.logger.withMetadata({ schemaPath }).debug('Loaded shared schema');
      return schema;
    } catch (error) {
      this.logger.withError(error).error('Failed to load shared schema');
      throw error;
    }
  }

  async loadProtocol(protocolPath: string): Promise<Record<string, unknown>> {
    try {
      const content = await readFile(protocolPath, 'utf8');
      const protocol = JSON.parse(content);

      this.logger.withMetadata({ protocolPath }).debug('Loaded shared protocol');
      return protocol;
    } catch (error) {
      this.logger.withError(error).error('Failed to load shared protocol');
      throw error;
    }
  }

  async loadCodec(codecPath: string, config: Record<string, unknown>): Promise<RadioCodec> {
    try {
      // Dynamically load codec module
      const codecModule = await import(codecPath);

      // Check for CodecFactory export
      if (!codecModule.CodecFactory) {
        throw new Error(`Codec module does not export CodecFactory: ${codecPath}`);
      }

      const CodecFactory = codecModule.CodecFactory;
      const factory = new CodecFactory();

      // Create codec with configuration
      const codec = await factory.createCodec(config.modelId as any, config, this.logger);

      this.logger.withMetadata({ codecPath, modelId: config.modelId }).info('Loaded shared codec');
      return codec;
    } catch (error) {
      this.logger.withError(error).error('Failed to load shared codec');
      throw error;
    }
  }

  resolveReference(reference: string, basePath: string): string {
    // Handle absolute module paths (e.g., @scope/package/path)
    if (reference.startsWith('@') || (!reference.startsWith('./') && !reference.startsWith('../') && !reference.startsWith('/'))) {
      return reference;
    }

    // Handle absolute file system paths
    if (reference.startsWith('/')) {
      return reference;
    }

    // Handle relative paths - check if basePath is in node_modules
    if (basePath.includes('node_modules')) {
      // For JavaScript files (codecs), convert to module specifiers
      // For other files (schemas, configs), use file system paths
      const isJavaScriptFile = reference.endsWith('.js') || reference.endsWith('.mjs') || reference.endsWith('.ts');

      if (isJavaScriptFile) {
        // Extract module name from path
        const nodeModulesIndex = basePath.indexOf('node_modules');
        const afterNodeModules = basePath.substring(nodeModulesIndex + 'node_modules/'.length);
        const pathParts = afterNodeModules.split('/');
        
        // Handle scoped packages (@scope/package) vs regular packages
        const moduleName = pathParts[0] && pathParts[0].startsWith('@') && pathParts[1]
          ? `${pathParts[0]}/${pathParts[1]}` 
          : pathParts[0];
        
        // Resolve the reference relative to the module
        // Remove leading ../ to get the path relative to module root
        let relativePath = reference;

        while (relativePath.startsWith('../')) {
          relativePath = relativePath.substring(3);
        }

        return `${moduleName}/${relativePath}`;
      }
    }

    // Default to file system path join for non-JS files and non-module paths
    return join(basePath, reference);
  }
}
