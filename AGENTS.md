# note_system 协作与写作指南

## 这个仓库是什么

`note_system` 是笔记网站的应用代码仓库，负责前端页面、Cloudflare Pages Functions API、Markdown/Obsidian 解析、搜索索引、缓存和部署配置。

生产站点目前部署在 Cloudflare Pages，项目名是 `note-system`。应用运行时会读取 GitHub 内容仓库中的 Markdown 文件，并通过 Cloudflare KV 缓存索引。

请区分两个仓库：

- `note_system`：应用代码仓库。这里改 Vue、API、解析逻辑、部署脚本和测试。
- `MixGeeker/venezuela_note_prod`：生产笔记内容仓库。这里放 Markdown 笔记、附件和 `site.yml`。

## 当前技术栈

- Vue 3 + TypeScript + Vite
- Vue Router + Pinia
- Tailwind CSS
- Markdown 渲染：`markdown-it`、`highlight.js`
- Cloudflare Pages + Pages Functions
- Cloudflare KV：缓存笔记索引和站点配置
- GitHub API：读取笔记内容仓库

## 重要目录

```text
src/                  前端应用代码
functions/api/        Cloudflare Pages Functions 路由
functions/_shared/    GitHub、Obsidian、索引等共享逻辑
tests/                Node 测试
public/               静态公开文件
wrangler.toml         Cloudflare Pages / KV / 环境变量配置
package.json          本地开发、验证、部署脚本
```

## 本地开发

安装依赖后常用命令：

```powershell
npm.cmd run dev
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Cloudflare 相关本地变量放在 `.dev.vars`，不要提交这个文件。生产环境的公开变量在 `wrangler.toml`，密钥通过 Cloudflare Pages Secret 设置。

当前生产内容源：

```toml
GITHUB_OWNER = "MixGeeker"
GITHUB_REPO = "venezuela_note_prod"
NOTES_PATH = ""
```

## 发版

发版使用：

```powershell
npm.cmd run deploy
```

这个命令会依次执行：

```text
npm run test
npm run typecheck
npm run build
wrangler pages deploy dist --project-name note-system --branch main
```

如果只是更新生产笔记内容仓库里的 Markdown，通常不需要重新部署应用。Cloudflare KV 的笔记索引缓存约 5 分钟后刷新。

## 协作原则

- 小步提交，每个 PR 只解决一个明确问题。
- 修改共享解析逻辑时，优先补充或更新 `tests/obsidian-core.test.ts`。
- 不要把 `.dev.vars`、token、密码、私钥或其他敏感信息写进仓库。
- 不要提交 `node_modules/`、`dist/`、`.wrangler/`。
- 不要随意重命名已发布的内容路径，路径会影响站内链接和外部链接。
- 遇到不确定的产品行为，优先保持兼容已有内容。

## 代码变更建议

### 前端

- 页面放在 `src/pages/`，可复用 UI 放在 `src/components/`。
- 全局状态使用 Pinia store，避免跨组件隐式共享临时变量。
- 路由生成逻辑优先复用 `src/utils/routes.ts`。
- UI 文案要简洁，不要在页面里写大量功能说明。

### API 和索引

- Pages Functions 放在 `functions/api/`。
- GitHub API 封装优先放在 `functions/_shared/github.ts`。
- Obsidian/Markdown 路径、链接、frontmatter、索引逻辑优先放在 `functions/_shared/obsidian-core.ts`。
- 外部输入路径必须经过 `normalizeVaultPath`，避免路径穿越。
- 空仓库、空目录、草稿、隐藏目录都应有明确行为。

### 缓存

当前主要缓存 key：

```text
vault:index:v2
config:site:v3
```

如果变更索引结构或公开 API 响应结构，考虑是否需要升级缓存 key，避免旧缓存和新代码不兼容。

## 内容写作指南

生产内容仓库中的每篇笔记推荐使用 `.md` 文件。普通 Markdown 默认会被发布，除非显式标记为草稿或不发布。

推荐 frontmatter：

```yaml
---
title: 页面标题
tags: [guide, deploy]
aliases: [别名, 旧名称]
permalink: custom/path
publish: true
---
```

常用字段：

- `title`：页面标题。
- `tags`：标签，用于搜索和整理。
- `aliases` 或 `alias`：别名，用于链接解析。
- `permalink`：自定义访问路径。
- `publish: false`：不发布。
- `draft: true`：草稿，不发布。

默认规则：没有 `publish: false` 且没有 `draft: true` 的 Markdown 会被视为可发布。

## 链接写法

支持 Obsidian 双链：

```markdown
[[另一篇笔记]]
[[guides/deployment|部署说明]]
[[README#快速开始]]
```

支持普通 Markdown 链接：

```markdown
[部署说明](guides/deployment.md)
```

支持附件嵌入：

```markdown
![[assets/screenshot.png]]
![截图](assets/screenshot.png)
```

写链接时尽量指向真实存在的文件。系统会记录无法解析或存在歧义的链接，但不会自动修复。

## 附件规范

当前主要识别：

- 图片：`avif`、`bmp`、`gif`、`ico`、`jpeg`、`jpg`、`png`、`svg`、`webp`
- 音频：`flac`、`m4a`、`mp3`、`ogg`、`wav`
- 视频：`mov`、`mp4`、`webm`
- 文档：`pdf`

附件建议放在 `assets/` 或与笔记相邻的清晰目录中。不要把大量大型媒体文件放进内容仓库。

## 站点配置

内容仓库根目录可放 `site.yml`：

```yaml
title: Notes
description: A public note vault
short_name: Notes
icon: assets/app-icon.png
favicon: assets/favicon.svg
apple_touch_icon: assets/apple-touch-icon.png
maskable_icon: assets/maskable-icon.png
theme_color: "#2563eb"
background_color: "#f9fafb"
lang: zh-CN
```

当前只支持简单的 `key: value` 形式，不支持复杂嵌套 YAML。`title`、`short_name`、`description`、颜色、语言和图标会用于页面标题、PWA 安装信息、manifest、favicon 和 apple-touch-icon。

图标推荐放在内容仓库的 `assets/` 目录。最小配置建议使用 `icon: assets/app-icon.png`，这样系统可以同时用于普通图标、favicon、apple 图标和 maskable 图标。若 `icon` 使用 SVG 或 WebP，安卓/manifest 通常可用，但 iOS 主屏幕图标需要单独提供 PNG：`apple_touch_icon: assets/apple-touch-icon.png`。系统会让根路径 `/apple-touch-icon.png` 优先返回内容仓库中的 PNG 图标，缺失或读取失败时再退回应用内置图标。需要精细控制时再补充 `favicon`、`apple_touch_icon`、`maskable_icon`；maskable 图标应预留安全边距。

## 系统能做什么

- 读取 GitHub 仓库中的 Markdown 内容。
- 建立笔记索引、标签索引、别名索引和链接图。
- 渲染 Markdown、代码块、站内链接和附件。
- 搜索标题、路径、别名、标签和正文。
- 隐藏 `draft: true`、`publish: false`、隐藏目录和私有工具目录。
- 在空仓库时正常返回空列表，而不是报错。

## 系统不能做什么

- 不提供内容权限分级。
- 不适合保存密钥、隐私资料或敏感业务数据。
- 不保证内容推送后立即刷新。
- 不自动理解所有 Obsidian 插件语法。
- 不负责在线编辑和 PR 协作流程，除非后续明确实现。
- 不适合作为大型媒体文件仓库。

## 给自动化 Agent 的规则

如果你是 Agent，请先读完本文再修改仓库。

可以做：

- 修复 bug，并补充对应测试。
- 整理小范围重复代码。
- 改进 Markdown 解析、链接解析、缓存和 API 行为。
- 补充文档、部署说明和内容写作规范。

不要做：

- 提交或复述任何 token、密钥、密码。
- 删除大量内容或重命名公开路径，除非用户明确要求。
- 修改与任务无关的配置、样式或构建产物。
- 把内容仓库的生产笔记直接复制进代码仓库。
- 绕过测试或跳过明显需要的验证。

## 提交前检查

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

文档-only 改动可以不跑完整构建，但如果改到 `functions/`、`src/`、`package.json`、`wrangler.toml`，至少运行相关验证。

提交前确认：

- 没有敏感信息。
- 没有意外修改 `dist/`、`.wrangler/`、`.dev.vars`。
- 新行为有测试或明确说明。
- 文档中的命令和仓库名与当前配置一致。
