export interface R2Config {
  rootDir: string;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain: string;
  keyPrefix: string;
  deleteLocalAfterUpload: boolean;
  autoMigrateRemote: boolean;
  isConfigured: boolean;
}

export function loadR2Config(rootDir?: string): R2Config;

export function processMarkdownFile(
  mdFilePath: string,
  options?: {
    rootDir?: string;
    config?: R2Config;
    cache?: Record<string, string>;
    logger?: Console;
  },
): Promise<{ changed: boolean; replacements: number }>;

export function processAllMarkdownFiles(options?: {
  rootDir?: string;
  dirs?: string[];
  logger?: Console;
}): Promise<{ scanned: number; modifiedFiles: number; replacements: number }>;

