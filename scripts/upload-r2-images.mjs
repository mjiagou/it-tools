import path from 'node:path';
import process from 'node:process';
import { loadR2Config, processAllMarkdownFiles, processMarkdownFile } from './r2-uploader.mjs';

async function main() {
  const rootDir = process.cwd();
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));

  if (args.length > 0) {
    const config = loadR2Config(rootDir);
    if (!config.isConfigured) {
      console.warn('[r2-upload] 请先在 .env 或环境变量中配置完整的 R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_PUBLIC_DOMAIN');
      process.exit(1);
    }

    for (const target of args) {
      const fullPath = path.resolve(rootDir, target);
      await processMarkdownFile(fullPath, { config });
    }
    return;
  }

  await processAllMarkdownFiles({ rootDir });
}

main().catch((err) => {
  console.error('[r2-upload] 执行异常:', err);
  process.exit(1);
});

