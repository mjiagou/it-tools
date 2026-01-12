# 静态博客（/blog/）

该目录包含一个纯前端的 Vue 3 博客实现，支持通过 JSON 动态渲染文章列表与详情。可在 `/blog/` 路径下直接部署为静态资源，无需后端服务。

## 文件结构

- `index.html`：博客主页与文章详情页（单页应用），使用 Vue 3 + marked.js 渲染 Markdown。
- `data/posts.json`：文章元信息与内容，支持 `contentMarkdown`、`excerptMarkdown`、`tags`。
- `scripts/publish.js`：通过命令行向 `posts.json` 发布新文章（支持 Markdown）。

## 本地预览

任意静态文件服务器即可，例如：

```bash
# Python 3
python -m http.server 8000 --directory blog

# Node
npx serve blog -p 8000
```

然后访问 `http://localhost:8000`。

## 发布新文章

使用 `scripts/publish.js` 快速追加文章到 `posts.json`。

### 基础示例（写 Markdown）

```bash
node blog/scripts/publish.js \
  --title "Vue 3 静态博客实践" \
  --contentMarkdown "## 引言\n这篇介绍如何用纯前端渲染文章..." \
  --excerptMarkdown "快速用 Vue 3 搭建静态博客，支持 Markdown 与标签。" \
  --tags "vue,static-site,markdown"
```

### 选项说明

- `--title`：文章标题（必选）。
- `--contentMarkdown` 或 `--content`：正文内容（必选，优先用 `contentMarkdown`）。
- `--excerptMarkdown` 或 `--excerpt`：摘要（可选，会自动从内容截取）。
- `--date`：发布日期（可选，默认当前日期）。
- `--tags`：标签列表，用英文逗号分隔（可选）。

### 运行后效果

脚本会在 `posts.json` 头部插入一条新文章，刷新博客页即可看到新文章。

## 数据格式

```json
{
  "id": 1736467200000,
  "slug": "vue-3-static-blog-practice",
  "title": "Vue 3 静态博客实践",
  "date": "2025-01-12",
  "excerptMarkdown": "...",
  "contentMarkdown": "## 引言\n...",
  "excerpt": "纯文本摘要...",
  "content": "<p>...</p>",
  "image": "https://picsum.photos/seed/vue-3-static-blog-practice/600/360",
  "tags": ["vue", "static-site", "markdown"]
}
```

- `id`：脚本用 `Date.now()` 生成，确保唯一。
- `slug`：由标题自动生成，用于前端 URL 路由。
- `contentMarkdown`/`excerptMarkdown`：前台页面会用 `marked` 转为 HTML；也支持直接存 `content`、`excerpt` 兜底。
- `image`：占位图，按 slug 自动生成；如需自定义可改字段。

## 前端路由与搜索

- 首页展示文章列表，带搜索框（按标题、摘要、标签过滤）。
- 点击文章进入 `/blog/#/post/:slugOrId` 详情页。
- 返回按钮可回到列表页并清空搜索。

## CI/CD 集成建议

1. 将 `blog/` 目录作为纯静态资源部署到服务器的 `/blog/` 路径。
2. 如果想自动发布，可在 Git 提交时调用 `publish.js` 并提交生成的 `posts.json`，或通过 GitHub Action 运行该脚本后部署。
3. 对 `index.html`、`posts.json` 设置合理的缓存策略，确保更新及时生效。

## 与主站的联动

- 主站首页的“文章精选”区域可复用 `posts.json` 中的最新 4 篇文章，调用 `fetch('/blog/data/posts.json')` 读取。
- 若有国际语言需求，可给文章数据增加 `lang` 字段并在主站页做语言过滤。

## 扩展方向

- 增加分页功能（修改 filteredPosts 的计算逻辑）。
- 增加归档页与标签页（根据 tags 或月份过滤）。
- 支持评论/统计第三方脚本嵌入。
- 迁移到 VuePress/VitePress 以获得更完整的文档能力（可选）。

---

> 该实现保持了极简、无后端依赖的优势，便于快速在 `/blog/` 路径部署和二次开发。
