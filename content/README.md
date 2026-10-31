# 文章管理与 R2 图床自动上传指南

本目录存放站点的 Markdown 技术文章（访问路径为 `/articles` 与 `/articles/<slug>`）。

## 1. 如何新增文章

在 `content/articles/` 下新建 `.md` 文件（例如 `content/articles/my-guide.md`，或者带同目录图片的 `content/articles/my-guide/index.md`）：

```markdown
---
title: 文章标题
description: 文章一句话摘要（用于列表展示与 SEO Meta Description）
date: 2026-10-30
tags:
  - 开发工具
  - 实战指南
cover: ./assets/cover.png
draft: false
---

正文内容，支持标准 Markdown、代码高亮、表格以及图片：

![示例图片](./assets/demo.png)
![外链图片](https://example.com/diagram.png)
```

## 2. 图片自动上传 Cloudflare R2 机制

- **触发时机**：
  - 本地开发（`pnpm dev`）：保存 `.md` 文件时自动检测并上传图片，实时将 `.md` 中的图片路径替换为 `https://img.888467.xyz/888467/YYYY/MM/<hash>.<ext>`。
  - 手动执行（`pnpm upload:r2`）：批量扫描 `content/` 与 `src/` 下的所有 Markdown 文件。
  - 构建发布（`pnpm build` / Cloudflare Pages 自动构建）：构建前自动上传未迁移的本地图片与第三方外链图片（当 `R2_AUTO_MIGRATE_REMOTE=true` 时）。
- **共用存储桶隔离**：所有上传至 `r2-52-emdash-133861` 的图片均自动存放在 `888467/YYYY/MM/` 前缀下，与其他项目互不干扰，且基于文件内容 SHA-256 去重，不会重复上传。
- **代码块保护**：Markdown 代码块（` ``` `）或行内代码（`` ` ``）中的示例图片语法不会被误替换。

