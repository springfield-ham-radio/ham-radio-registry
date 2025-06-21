import type { ILogLayer } from 'loglayer';
import type { NpmPluginInfo } from '../types/plugin-module.js';

/**
 * NPM registry client for plugin discovery and validation
 */
export interface NpmClient {
  // Get package information from npm registry
  getPackageInfo(packageName: string): Promise<any>;

  // Search for packages with query
  searchPackages(query: string): Promise<NpmPluginInfo[]>;

  // Get package download statistics
  getPackageStats(packageName: string): Promise<any>;

  // Validate package exists and is accessible
  validatePackage(packageName: string): Promise<boolean>;
}

/**
 * NPM search response interface
 */
interface NpmSearchResponse {
  objects: Array<{
    package: {
      name: string;
      version: string;
      description?: string;
      author?: any;
      license?: string;
      repository?: { url: string };
      homepage?: string;
      keywords?: string[];
      date?: string;
      springfield?: any;
    };
  }>;
}

/**
 * Default implementation of NPM client using npm registry API
 */
export class DefaultNpmClient implements NpmClient {
  private logger: ILogLayer;
  private baseUrl = 'https://registry.npmjs.org';

  constructor(logger: ILogLayer) {
    this.logger = logger;
  }

  async getPackageInfo(packageName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${packageName}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Package not found: ${packageName}`);
        }
        throw new Error(`Failed to fetch package info: ${response.statusText}`);
      }

      const packageInfo = await response.json();

      this.logger.withMetadata({ packageName }).info('Retrieved package info');
      return packageInfo;
    } catch (error) {
      this.logger.withError(error).error('Failed to get package info');
      throw error;
    }
  }

  async searchPackages(query: string): Promise<NpmPluginInfo[]> {
    try {
      const searchQuery = encodeURIComponent(query);
      const response = await fetch(`${this.baseUrl}/-/v1/search?text=${searchQuery}&size=50`);

      if (!response.ok) {
        throw new Error(`Failed to search packages: ${response.statusText}`);
      }

      const searchResults = (await response.json()) as NpmSearchResponse;
      const packages = searchResults.objects || [];

      // Filter and transform results
      const pluginPackages: NpmPluginInfo[] = [];

      for (const pkg of packages) {
        const packageInfo = pkg.package;

        // Check if this is a radio module
        if (this.isRadioModule(packageInfo)) {
          pluginPackages.push(this.transformToNpmPluginInfo(packageInfo));
        }
      }

      this.logger.withMetadata({ query, results: pluginPackages.length }).info('Searched packages');
      return pluginPackages;
    } catch (error) {
      this.logger.withError(error).error('Failed to search packages');
      throw error;
    }
  }

  async getPackageStats(packageName: string): Promise<any> {
    try {
      // Note: npm registry doesn't provide download stats via public API
      // This would require npmjs.com API or alternative data source
      this.logger.withMetadata({ packageName }).warn('Package stats not available via public npm registry API');
      return { downloads: 0, lastUpdated: new Date().toISOString() };
    } catch (error) {
      this.logger.withError(error).error('Failed to get package stats');
      throw error;
    }
  }

  async validatePackage(packageName: string): Promise<boolean> {
    try {
      await this.getPackageInfo(packageName);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return false;
      }
      throw error;
    }
  }

  private isRadioModule(packageInfo: any): boolean {
    const name = packageInfo.name || '';

    // Check naming convention
    const isNamedCorrectly = name.includes('radio-module') || name.startsWith('@springfield/radio-module-');

    // Check springfield plugin field
    const hasSpringfieldField = packageInfo.springfield?.pluginType === 'radio-module';

    // Check keywords
    const hasKeywords = packageInfo.keywords?.includes('radio-module');

    return isNamedCorrectly || hasSpringfieldField || hasKeywords;
  }

  private transformToNpmPluginInfo(packageInfo: any): NpmPluginInfo {
    return {
      name: packageInfo.name,
      version: packageInfo.version,
      description: packageInfo.description || '',
      author: this.extractAuthor(packageInfo.author),
      license: packageInfo.license || 'Unknown',
      repository: packageInfo.repository?.url || packageInfo.homepage,
      downloads: 0, // Not available via public API
      lastUpdated: packageInfo.date || new Date().toISOString(),
      springfield: packageInfo.springfield,
    };
  }

  private extractAuthor(author: any): string {
    if (typeof author === 'string') {
      return author;
    }
    if (typeof author === 'object' && author.name) {
      return author.name;
    }
    return 'Unknown';
  }
}
