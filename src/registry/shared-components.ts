import type { ILogLayer } from 'loglayer';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { RadioCodec } from '@springfield/ham-radio-api';

/**
 * Interface for managing shared components across radio models
 */
export interface SharedComponentManager {
  // Load shared schema
  loadSchema(schemaPath: string): Promise<any>;

  // Load shared protocol
  loadProtocol(protocolPath: string): Promise<any>;

  // Load shared codec
  loadCodec(codecPath: string, config: any): Promise<RadioCodec>;

  // Resolve component references
  resolveReference(reference: string, basePath: string): string;
}

/**
 * Default implementation of shared component manager
 */
export class DefaultSharedComponentManager implements SharedComponentManager {
  private logger: ILogLayer;
  private schemaCache = new Map<string, any>();
  private protocolCache = new Map<string, any>();

  constructor(logger: ILogLayer) {
    this.logger = logger;
  }

  async loadSchema(schemaPath: string): Promise<any> {
    // Check cache first
    if (this.schemaCache.has(schemaPath)) {
      return this.schemaCache.get(schemaPath);
    }

    try {
      // Load and validate schema
      const schema = await this.loadFile(schemaPath);
      const validatedSchema = this.validateSchema(schema);

      // Cache the result
      this.schemaCache.set(schemaPath, validatedSchema);

      this.logger.withMetadata({ schemaPath }).info('Loaded shared schema');
      return validatedSchema;
    } catch (error) {
      this.logger.withError(error).error('Failed to load shared schema');
      throw error;
    }
  }

  async loadProtocol(protocolPath: string): Promise<any> {
    // Check cache first
    if (this.protocolCache.has(protocolPath)) {
      return this.protocolCache.get(protocolPath);
    }

    try {
      // Load and validate protocol
      const protocol = await this.loadFile(protocolPath);
      const validatedProtocol = this.validateProtocol(protocol);

      // Cache the result
      this.protocolCache.set(protocolPath, validatedProtocol);

      this.logger.withMetadata({ protocolPath }).info('Loaded shared protocol');
      return validatedProtocol;
    } catch (error) {
      this.logger.withError(error).error('Failed to load shared protocol');
      throw error;
    }
  }

  async loadCodec(codecPath: string, config: any): Promise<RadioCodec> {
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
      const codec = await factory.createCodec(config.modelId, config, this.logger);

      this.logger.withMetadata({ codecPath, modelId: config.modelId }).info('Loaded shared codec');
      return codec;
    } catch (error) {
      this.logger.withError(error).error('Failed to load shared codec');
      throw error;
    }
  }

  resolveReference(reference: string, basePath: string): string {
    if (reference.startsWith('shared/')) {
      return join(basePath, reference);
    }
    return reference;
  }

  private async loadFile(filePath: string): Promise<any> {
    try {
      const content = await readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load file ${filePath}: ${error}`);
    }
  }

  private validateSchema(schema: any): any {
    // Basic schema validation - could be enhanced with AJV
    if (typeof schema !== 'object' || schema === null) {
      throw new Error('Schema must be a valid JSON object');
    }

    return schema;
  }

  private validateProtocol(protocol: any): any {
    // Basic protocol validation
    if (typeof protocol !== 'object' || protocol === null) {
      throw new Error('Protocol must be a valid JSON object');
    }

    return protocol;
  }
}
