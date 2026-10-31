import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
};

const EXT_BY_MIME = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
  'image/bmp': '.bmp',
};

const PROTECTED_PUBLIC_FILES = new Set([
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'safari-pinned-tab.svg',
  'banner.png',
  'mstile-70x70.png',
  'mstile-144x144.png',
  'mstile-150x150.png',
  'mstile-310x150.png',
  'mstile-310x310.png',
]);

/**
 * Parse .env file content into key-value pairs.
 */
export function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const result = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) {
      continue;
    }
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith('\'') && value.endsWith('\''))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/**
 * Load R2 configuration from process.env + .env.local + .env
 */
export function loadR2Config(rootDir = process.cwd()) {
  const dotEnv = parseEnvFile(path.join(rootDir, '.env'));
  const dotEnvLocal = parseEnvFile(path.join(rootDir, '.env.local'));
  const merged = {
    ...dotEnv,
    ...dotEnvLocal,
    ...process.env,
  };

  const accountId = (merged.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = (merged.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (merged.R2_SECRET_ACCESS_KEY || '').trim();
  const bucketName = (merged.R2_BUCKET_NAME || '').trim();
  const publicDomain = (merged.R2_PUBLIC_DOMAIN || '').trim().replace(/\/+$/, '');
  const keyPrefix = (merged.R2_KEY_PREFIX ?? '888467').trim().replace(/^\/+|\/+$/g, '');
  const deleteLocalAfterUpload = String(merged.R2_DELETE_LOCAL_AFTER_UPLOAD || 'false').toLowerCase() === 'true';
  const autoMigrateRemote = String(merged.R2_AUTO_MIGRATE_REMOTE ?? 'true').toLowerCase() !== 'false';

  const isConfigured = Boolean(
    accountId
    && accessKeyId
    && secretAccessKey
    && bucketName
    && publicDomain
    && !accountId.startsWith('your_'),
  );

  return {
    rootDir,
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicDomain,
    keyPrefix,
    deleteLocalAfterUpload,
    autoMigrateRemote,
    isConfigured,
  };
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function hmacHex(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

function encodeRfc3986(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function formatAmzDate(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function buildSignedR2Request({ method, config, key, headers = {}, payloadHash }) {
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const { amzDate, dateStamp } = formatAmzDate();
  const canonicalUri = `/${encodeRfc3986(config.bucketName)}/${key.split('/').map(encodeRfc3986).join('/')}`;

  const allHeaders = {
    ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()])),
    'host': host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };

  const sortedHeaderKeys = Object.keys(allHeaders).sort();
  const canonicalHeaders = sortedHeaderKeys.map(k => `${k}:${allHeaders[k]}\n`).join('');
  const signedHeaders = sortedHeaderKeys.join(';');

  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hmacHex(kSigning, stringToSign);

  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const fetchHeaders = { ...allHeaders, Authorization: authorization };
  delete fetchHeaders.host;

  return {
    url: `https://${host}${canonicalUri}`,
    headers: fetchHeaders,
  };
}

async function r2HeadObject(config, key) {
  const emptyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const req = buildSignedR2Request({
    method: 'HEAD',
    config,
    key,
    payloadHash: emptyHash,
  });
  const res = await fetch(req.url, {
    method: 'HEAD',
    headers: req.headers,
  });
  if (res.status === 200) {
    return true;
  }
  if (res.status === 404) {
    return false;
  }
  throw new Error(`R2 HEAD failed (${res.status} ${res.statusText}) for key: ${key}`);
}

async function r2PutObject(config, key, buffer, contentType) {
  const payloadHash = sha256Hex(buffer);
  const req = buildSignedR2Request({
    method: 'PUT',
    config,
    key,
    payloadHash,
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
  const res = await fetch(req.url, {
    method: 'PUT',
    headers: req.headers,
    body: buffer,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`R2 PUT failed (${res.status} ${res.statusText}) for key ${key}: ${errText}`);
  }
}

function detectImageTypeFromBuffer(buffer) {
  if (!buffer || buffer.length < 4) {
    return null;
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { ext: '.png', mime: 'image/png' };
  }
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { ext: '.jpg', mime: 'image/jpeg' };
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return { ext: '.gif', mime: 'image/gif' };
  }
  if (
    buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { ext: '.webp', mime: 'image/webp' };
  }
  if (
    buffer.length >= 12
    && buffer.toString('ascii', 4, 8) === 'ftyp'
    && ['avif', 'avis'].includes(buffer.toString('ascii', 8, 12))
  ) {
    return { ext: '.avif', mime: 'image/avif' };
  }
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
    return { ext: '.bmp', mime: 'image/bmp' };
  }
  if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) {
    return { ext: '.ico', mime: 'image/x-icon' };
  }
  const headText = buffer.subarray(0, 512).toString('utf8').trimStart();
  if (headText.startsWith('<svg') || (headText.startsWith('<?xml') && headText.includes('<svg'))) {
    return { ext: '.svg', mime: 'image/svg+xml' };
  }
  return null;
}

function resolveExtAndMime({ buffer, hintPath = '', contentTypeHeader = '' }) {
  const cleanMime = contentTypeHeader.split(';')[0].trim().toLowerCase();
  if (cleanMime && EXT_BY_MIME[cleanMime]) {
    return { ext: EXT_BY_MIME[cleanMime], mime: cleanMime };
  }

  const detected = detectImageTypeFromBuffer(buffer);
  if (detected) {
    return detected;
  }

  const rawExt = path.extname(hintPath.split(/[?#]/)[0]).toLowerCase();
  if (rawExt && MIME_BY_EXT[rawExt]) {
    return { ext: rawExt === '.jpeg' ? '.jpg' : rawExt, mime: MIME_BY_EXT[rawExt] };
  }

  return { ext: '.png', mime: 'image/png' };
}

function loadLocalCache(rootDir) {
  const cachePath = path.join(rootDir, '.r2-upload-cache.json');
  if (!fs.existsSync(cachePath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8')) || {};
  }
  catch {
    return {};
  }
}

function saveLocalCache(rootDir, cache) {
  const cachePath = path.join(rootDir, '.r2-upload-cache.json');
  try {
    fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
  }
  catch {
    // Ignore cache write errors in read-only environments
  }
}

function extractDateFolderFromMarkdown(markdown) {
  const fmMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    const dateLine = fmMatch[1].match(/^date\s*:\s*['"]?(\d{4})-(\d{1,2})/m);
    if (dateLine) {
      return `${dateLine[1]}/${dateLine[2].padStart(2, '0')}`;
    }
  }
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}/${month}`;
}

function shouldSkipImageUrl(rawUrl, config) {
  const url = (rawUrl || '').trim();
  if (!url) {
    return true;
  }
  if (
    url.startsWith('data:')
    || url.startsWith('blob:')
    || url.startsWith('#')
    || url.startsWith('mailto:')
    || url.startsWith('javascript:')
  ) {
    return true;
  }
  if (config.publicDomain && (url === config.publicDomain || url.startsWith(`${config.publicDomain}/`))) {
    return true;
  }
  return false;
}

function isRemoteUrl(url) {
  return /^https?:\/\//i.test(url) || url.startsWith('//');
}

function resolveLocalImagePath(rawUrl, mdFilePath, rootDir) {
  const withoutHashOrQuery = rawUrl.split(/[?#]/)[0];
  let decoded = withoutHashOrQuery;
  try {
    decoded = decodeURIComponent(withoutHashOrQuery);
  }
  catch {
    // Keep as-is
  }

  if (decoded.startsWith('/')) {
    const fromPublic = path.join(rootDir, 'public', decoded);
    if (fs.existsSync(fromPublic) && fs.statSync(fromPublic).isFile()) {
      return fromPublic;
    }
    const fromRoot = path.join(rootDir, decoded);
    if (fs.existsSync(fromRoot) && fs.statSync(fromRoot).isFile()) {
      return fromRoot;
    }
    return null;
  }

  const fromMdDir = path.resolve(path.dirname(mdFilePath), decoded);
  if (fs.existsSync(fromMdDir) && fs.statSync(fromMdDir).isFile()) {
    return fromMdDir;
  }

  const fromRoot = path.resolve(rootDir, decoded);
  if (fs.existsSync(fromRoot) && fs.statSync(fromRoot).isFile()) {
    return fromRoot;
  }

  return null;
}

async function ensureUploadedToR2({ buffer, ext, mime, dateFolder, config, cache }) {
  const hash = sha256Hex(buffer).slice(0, 16);
  const keyParts = [config.keyPrefix, dateFolder, `${hash}${ext}`].filter(Boolean);
  const key = keyParts.join('/');
  const publicUrl = `${config.publicDomain}/${key}`;

  if (cache[key] === publicUrl) {
    return { key, publicUrl, uploaded: false };
  }

  const exists = await r2HeadObject(config, key);
  if (!exists) {
    await r2PutObject(config, key, buffer, mime);
    cache[key] = publicUrl;
    return { key, publicUrl, uploaded: true };
  }

  cache[key] = publicUrl;
  return { key, publicUrl, uploaded: false };
}

async function processSingleImageUrl({ rawUrl, mdFilePath, dateFolder, config, cache, localFilesToDelete, logger }) {
  const trimmedUrl = rawUrl.trim();
  if (shouldSkipImageUrl(trimmedUrl, config)) {
    return null;
  }

  if (isRemoteUrl(trimmedUrl)) {
    if (!config.autoMigrateRemote) {
      return null;
    }
    const fetchUrl = trimmedUrl.startsWith('//') ? `https:${trimmedUrl}` : trimmedUrl;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      let res;
      try {
        res = await fetch(fetchUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; IT-Tools-R2-Uploader/1.0; +https://888467.xyz)',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
          redirect: 'follow',
        });
      }
      finally {
        clearTimeout(timeout);
      }

      if (!res.ok) {
        logger.warn(`[r2-upload] 跳过远程图片（HTTP ${res.status}）: ${fetchUrl}`);
        return null;
      }

      const contentTypeHeader = res.headers.get('content-type') || '';
      if (contentTypeHeader.includes('text/html')) {
        logger.warn(`[r2-upload] 跳过远程链接（返回内容为 HTML 而非图片）: ${fetchUrl}`);
        return null;
      }

      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      if (buffer.length === 0) {
        logger.warn(`[r2-upload] 跳过空文件远程图片: ${fetchUrl}`);
        return null;
      }

      const pathname = new URL(fetchUrl).pathname;
      const { ext, mime } = resolveExtAndMime({
        buffer,
        hintPath: pathname,
        contentTypeHeader,
      });

      const { publicUrl, uploaded } = await ensureUploadedToR2({
        buffer,
        ext,
        mime,
        dateFolder,
        config,
        cache,
      });

      logger.info(`[r2-upload] ${uploaded ? '已迁移远程图片' : '复用已存在 R2 图片'}: ${fetchUrl} -> ${publicUrl}`);
      return publicUrl;
    }
    catch (err) {
      logger.warn(`[r2-upload] 抓取远程图片失败 (${fetchUrl}): ${err.message}`);
      return null;
    }
  }

  // Local image path
  const localPath = resolveLocalImagePath(trimmedUrl, mdFilePath, config.rootDir);
  if (!localPath) {
    logger.warn(`[r2-upload] 未找到本地图片 (${path.relative(config.rootDir, mdFilePath)}): ${trimmedUrl}`);
    return null;
  }

  try {
    const buffer = fs.readFileSync(localPath);
    const { ext, mime } = resolveExtAndMime({
      buffer,
      hintPath: localPath,
    });

    const { publicUrl, uploaded } = await ensureUploadedToR2({
      buffer,
      ext,
      mime,
      dateFolder,
      config,
      cache,
    });

    const relLocal = path.relative(config.rootDir, localPath);
    logger.info(`[r2-upload] ${uploaded ? '已上传本地图片' : '复用已存在 R2 图片'}: ${relLocal} -> ${publicUrl}`);

    if (config.deleteLocalAfterUpload) {
      const publicRoot = path.join(config.rootDir, 'public');
      const isProtectedPublic = localPath.startsWith(publicRoot) && PROTECTED_PUBLIC_FILES.has(path.basename(localPath));
      if (!isProtectedPublic && localPath.startsWith(config.rootDir)) {
        localFilesToDelete.add(localPath);
      }
    }

    return publicUrl;
  }
  catch (err) {
    logger.warn(`[r2-upload] 上传本地图片失败 (${localPath}): ${err.message}`);
    return null;
  }
}

async function replaceAsync(str, regex, asyncReplacer) {
  const matches = [];
  str.replace(regex, (...args) => {
    matches.push(args);
    return args[0];
  });
  if (matches.length === 0) {
    return str;
  }
  const replacements = [];
  for (const args of matches) {
    replacements.push(await asyncReplacer(...args));
  }
  let idx = 0;
  return str.replace(regex, () => replacements[idx++]);
}

/**
 * Process a single Markdown file, uploading local/remote images to R2 and replacing URLs.
 */
export async function processMarkdownFile(mdFilePath, options = {}) {
  const config = options.config || loadR2Config(options.rootDir);
  const logger = options.logger || console;

  if (!config.isConfigured) {
    return { changed: false, replacements: 0 };
  }

  if (!fs.existsSync(mdFilePath)) {
    return { changed: false, replacements: 0 };
  }

  const original = fs.readFileSync(mdFilePath, 'utf8');
  const dateFolder = extractDateFolderFromMarkdown(original);
  const cache = options.cache || loadLocalCache(config.rootDir);
  const localFilesToDelete = new Set();
  const urlMemo = new Map();
  let replacementCount = 0;

  const resolveReplacement = async (rawUrl) => {
    if (urlMemo.has(rawUrl)) {
      const cached = urlMemo.get(rawUrl);
      if (cached) {
        replacementCount++;
      }
      return cached;
    }
    const uploadedUrl = await processSingleImageUrl({
      rawUrl,
      mdFilePath,
      dateFolder,
      config,
      cache,
      localFilesToDelete,
      logger,
    });
    urlMemo.set(rawUrl, uploadedUrl);
    if (uploadedUrl) {
      replacementCount++;
    }
    return uploadedUrl;
  };

  let frontmatterBlock = '';
  let body = original;

  const fmMatch = original.match(/^(---\r?\n[\s\S]*?\r?\n---)(\r?\n?[\s\S]*)$/);
  if (fmMatch) {
    frontmatterBlock = fmMatch[1];
    body = fmMatch[2];

    // Process frontmatter image fields: cover, image, thumbnail, banner, ogImage
    frontmatterBlock = await replaceAsync(
      frontmatterBlock,
      /^((?:cover|image|thumbnail|banner|ogImage)\s*:\s*)(['"]?)([^'"\r\n#]+)\2(\s*(?:#.*)?)$/gm,
      async (full, prefix, quote, urlVal, trailing) => {
        const trimmed = urlVal.trim();
        if (!trimmed) {
          return full;
        }
        const newUrl = await resolveReplacement(trimmed);
        if (!newUrl) {
          return full;
        }
        const outQuote = quote || '';
        return `${prefix}${outQuote}${newUrl}${outQuote}${trailing}`;
      },
    );
  }

  // Protect fenced code blocks and inline code spans in Markdown body
  const protectedBlocks = [];
  const protect = (match) => {
    const token = `\0R2_CODE_PLACEHOLDER_${protectedBlocks.length}\0`;
    protectedBlocks.push(match);
    return token;
  };

  let workingBody = body
    .replace(/(^|\r?\n)(`{3,}|~{3,})[^\r\n]*\r?\n[\s\S]*?\r?\n\2(?=\r?\n|$)/g, protect)
    .replace(/`+[^`\r\n]+`+/g, protect);

  // 1. Markdown images with angle-bracket URLs: ![alt](<url> "title")
  workingBody = await replaceAsync(
    workingBody,
    /!\[([^\]]*)\]\(<([^>\r\n]+)>(\s+(?:"[^"]*"|'[^']*'))?\)/g,
    async (full, alt, urlVal, titlePart = '') => {
      const newUrl = await resolveReplacement(urlVal);
      return newUrl ? `![${alt}](${newUrl}${titlePart})` : full;
    },
  );

  // 2. Standard Markdown inline images: ![alt](url "title")
  workingBody = await replaceAsync(
    workingBody,
    /!\[([^\]]*)\]\(([^\s)\r\n]+)(\s+(?:"[^"]*"|'[^']*'))?\)/g,
    async (full, alt, urlVal, titlePart = '') => {
      const newUrl = await resolveReplacement(urlVal);
      return newUrl ? `![${alt}](${newUrl}${titlePart})` : full;
    },
  );

  // 3. Reference-style Markdown images: ![alt][ref] -> [ref]: url
  const imageRefIds = new Set();
  for (const m of workingBody.matchAll(/!\[([^\]]*)\]\s*\[([^\]]*)\]/g)) {
    const refId = (m[2] || m[1] || '').trim().toLowerCase();
    if (refId) {
      imageRefIds.add(refId);
    }
  }
  if (imageRefIds.size > 0) {
    workingBody = await replaceAsync(
      workingBody,
      /^(\s*\[([^\]]+)\]:\s*)<?([^\s>\r\n]+)>?(.*)$/gm,
      async (full, prefix, refId, urlVal, rest = '') => {
        if (!imageRefIds.has(refId.trim().toLowerCase())) {
          return full;
        }
        const newUrl = await resolveReplacement(urlVal);
        return newUrl ? `${prefix}${newUrl}${rest}` : full;
      },
    );
  }

  // 4. HTML <img src="..."> tags inside Markdown
  workingBody = await replaceAsync(
    workingBody,
    /<img\b([^>]*?)\bsrc=(["'])([^"']+)\2([^>]*?)>/gi,
    async (full, before, quote, urlVal, after) => {
      const newUrl = await resolveReplacement(urlVal);
      return newUrl ? `<img${before}src=${quote}${newUrl}${quote}${after}>` : full;
    },
  );

  // Restore protected code blocks
  workingBody = workingBody.replace(/\0R2_CODE_PLACEHOLDER_(\d+)\0/g, (_, idx) => protectedBlocks[Number(idx)]);

  const updated = frontmatterBlock ? `${frontmatterBlock}${workingBody}` : workingBody;

  if (!options.cache) {
    saveLocalCache(config.rootDir, cache);
  }

  if (updated !== original) {
    fs.writeFileSync(mdFilePath, updated, 'utf8');

    if (config.deleteLocalAfterUpload && localFilesToDelete.size > 0) {
      for (const filePath of localFilesToDelete) {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.info(`[r2-upload] 已按配置删除本地原图: ${path.relative(config.rootDir, filePath)}`);
          }
        }
        catch (err) {
          logger.warn(`[r2-upload] 删除本地原图失败 (${filePath}): ${err.message}`);
        }
      }
    }

    return { changed: true, replacements: replacementCount };
  }

  return { changed: false, replacements: 0 };
}

function collectMarkdownFiles(dirPath, ignoreNames = new Set(['node_modules', 'dist', '.git'])) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  const results = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (ignoreNames.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath, ignoreNames));
    }
    else if (entry.isFile() && entry.name.endsWith('.md') && entry.name.toLowerCase() !== 'readme.md') {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Scan all project article & content Markdown files and upload/replace images to R2.
 */
export async function processAllMarkdownFiles(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const logger = options.logger || console;
  const config = loadR2Config(rootDir);

  if (!config.isConfigured) {
    logger.info('[r2-upload] 未检测到完整的 R2 环境变量配置，跳过 Markdown 图片自动上传。');
    return { scanned: 0, modifiedFiles: 0, replacements: 0 };
  }

  const targetDirs = options.dirs || [
    path.join(rootDir, 'content'),
    path.join(rootDir, 'src'),
  ];

  const mdFiles = targetDirs.flatMap(dir => collectMarkdownFiles(dir));
  if (mdFiles.length === 0) {
    return { scanned: 0, modifiedFiles: 0, replacements: 0 };
  }

  const cache = loadLocalCache(rootDir);
  let modifiedFiles = 0;
  let totalReplacements = 0;

  for (const mdFile of mdFiles) {
    const res = await processMarkdownFile(mdFile, { config, cache, logger });
    if (res.changed) {
      modifiedFiles++;
      totalReplacements += res.replacements;
    }
  }

  saveLocalCache(rootDir, cache);

  if (modifiedFiles > 0) {
    logger.info(`[r2-upload] 处理完成：共扫描 ${mdFiles.length} 篇 Markdown，更新 ${modifiedFiles} 篇中的 ${totalReplacements} 处图片链接 -> ${config.publicDomain}/${config.keyPrefix}/...`);
  }
  else {
    logger.info(`[r2-upload] 扫描完成（${mdFiles.length} 篇 Markdown），所有图片均已是最新状态。`);
  }

  return {
    scanned: mdFiles.length,
    modifiedFiles,
    replacements: totalReplacements,
  };
}
