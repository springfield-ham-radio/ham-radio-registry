import type { ILogLayer } from 'loglayer';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { RadioCodec, SharedComponentManager } from '@springfield/ham-radio-api';

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
    // Handle relative paths
    if (reference.startsWith('./') || reference.startsWith('../')) {
      return join(basePath, reference);
    }

    // Handle absolute paths
    if (reference.startsWith('/')) {
      return reference;
    }

    // Default to relative path
    return join(basePath, reference);
  }
}
