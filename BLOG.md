# 博客功能说明

## 项目统一命令风格

```sh
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm run script:create:tool my-tool-name
```

## 博客相关命令

```sh
# 构建静态页和 posts.json
pnpm run script:build-blog

# 生产构建（已集成博客构建）
pnpm build

# 部署助手（拷贝 public/blog → dist/blog 并输出部署命令）
pnpm run script:deploy-blog
```

## 使用方式

1. 在 `blog/content/*.md` 编写文章（支持 front‑matter）
2. 本地运行 `pnpm run script:build-blog`，或直接 `pnpm dev`（首页会动态拉取 posts.json）
3. 生产发布推送到仓库后，CI 会自动构建并部署 `/blog/` 目录

## 访问路径

- 列表页：`/blog/`
- 文章页：`/blog/<slug>/`

## CI/CD

已提供 `.github/workflows/deploy-blog.yml` 示例，配置 Secrets 后即可自动部署：

- 支持触发条件：blog/content/** 或 blog/scripts/** 变更
- 支持手动触发

请配置仓库 Secrets：

- `REMOTE_USER`、`REMOTE_HOST`、`REMOTE_PATH`、`SSH_PRIVATE_KEY`
- 或 `AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`（S3 方案）

---

> 完整使用指南请参考项目根 README.md 中的“Blog”章节。
