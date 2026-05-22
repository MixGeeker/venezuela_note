# Note System - 笔记应用规划文档

## 项目背景

构建一个无认证、开放协作的笔记 Web 应用。任何人可以浏览和编辑笔记，编辑操作自动提交为 GitHub Pull Request，由维护者手动审核合并。应用同时支持 PWA 离线使用。

**技术栈**: Vue 3 + TypeScript + Vite
**部署**: Cloudflare Pages
**存储**: GitHub 仓库 (Markdown 文件)
**编辑器**: Tiptap (所见即所得)

---

## 技术选型总览

| 层级 | 技术 | 选型理由 |
|------|------|----------|
| 框架 | Vue 3 + TypeScript + Vite | Composition API, 类型安全, 快速构建 |
| 路由 | Vue Router 4 | SPA 路由, Composition API 支持 |
| 状态管理 | Pinia | Vue 官方推荐, 类型安全 |
| 样式 | Tailwind CSS 4 | `@tailwindcss/vite` 插件, 无需配置文件 |
| 编辑器 | Tiptap 2 + `@tiptap/markdown` | 所见即所得, 原生 Markdown 双向转换 |
| PWA | vite-plugin-pwa | Vite 生态标准, Workbox 驱动 |
| 托管 | Cloudflare Pages | 全球 CDN, Git 集成自动部署 |
| API | Cloudflare Pages Functions | 无服务器, 安全存储 Token |
| 存储 | GitHub Contents API | 笔记即 .md 文件, 自带版本历史 |
| 缓存 | Cloudflare KV | 边缘缓存 GitHub API 响应 |
| 工具库 | VueUse, markdown-it, highlight.js | composables, 渲染, 代码高亮 |

---

## 系统架构

```
[用户浏览器 / PWA]
    │  Vue 3 SPA + Tiptap + Service Worker
    ▼
[Cloudflare Edge]
    │  Pages (静态托管) + Pages Functions (/api/*) + KV (缓存层)
    ▼
[GitHub API]
    │  读取: Contents API (获取文件/目录树)
    │  写入: 创建分支 → 提交文件 → 开 PR
    ▼
[GitHub 仓库]
    └── notes/
        ├── getting-started.md
        ├── guides/
        │   └── deployment.md
        └── dev-logs/
            └── 2026-05-21.md
```

---

## 笔记格式规范

每个笔记是一个 `.md` 文件，包含可选的 YAML frontmatter:

```markdown
---
title: Getting Started
tags: [guide, setup]
date: 2026-05-21
---

正文内容 (Markdown)...
```

---

## API 设计

### 读取类

| 方法 | 路径 | 说明 | 缓存策略 |
|------|------|------|----------|
| GET | `/api/notes` | 获取文件夹树结构 | KV 缓存 5 分钟 |
| GET | `/api/notes/:path` | 获取单个笔记内容 (元数据 + 正文) | KV 缓存 5 分钟 |
| GET | `/api/search?q=xxx` | 搜索笔记内容 | KV 缓存 2 分钟 |

### 写入类 (均创建 PR)

| 方法 | 路径 | 说明 | 请求体 |
|------|------|------|--------|
| POST | `/api/notes` | 创建新笔记 | `{ path, content, title, tags }` |
| PUT | `/api/notes/:path` | 更新笔记 | `{ content, sha, title?, tags? }` |
| DELETE | `/api/notes/:path` | 删除笔记 | `{ sha }` |

写入统一流程: 创建新分支 → 提交文件变更 → 开 PR → 清除相关缓存。返回 `{ prUrl, prNumber, branchName }`。

---

## 项目目录结构

```
note_system/
├── functions/                    # Cloudflare Pages Functions (API)
│   ├── _shared/
│   │   └── github.ts            # GitHub API 封装
│   └── api/
│       ├── notes/
│       │   ├── index.ts         # GET 列表 / POST 创建
│       │   └── [path].ts        # GET / PUT / DELETE 单笔记
│       └── search.ts            # GET 搜索
├── src/
│   ├── components/              # Vue 组件
│   ├── composables/             # 组合式函数
│   ├── layouts/                 # 布局组件
│   ├── pages/                   # 页面组件
│   ├── stores/                  # Pinia 状态
│   ├── types/                   # TypeScript 类型
│   ├── utils/                   # 工具函数
│   ├── App.vue
│   ├── main.ts
│   ├── router.ts
│   └── assets/main.css
├── public/icons/                # PWA 图标
├── vite.config.ts
├── tsconfig.json
├── wrangler.toml                # Cloudflare 配置
└── package.json
```

---

## 路由规划

| 路由 | 页面 | 功能 |
|------|------|------|
| `/` | HomePage | 笔记列表 + 文件夹树 |
| `/note/:path(.*)` | NotePage | 查看/编辑单个笔记 |
| `/new` | NewNotePage | 新建笔记 |
| `/search` | SearchPage | 搜索结果 |

---

## 安全策略

无认证场景下的防护措施:

1. **IP 频率限制**: KV 记录每个 IP 写操作次数, 每小时限 5 次
2. **路径校验**: 拒绝 `..` 路径穿越, 限制在 `notes/` 目录内
3. **内容大小限制**: 单个笔记不超过 1MB
4. **固定 commit 消息**: 使用格式化模板, 不接受用户自定义

---

## 阶段规划

### MVP: 笔记浏览与存储

**目标**: 完整的笔记浏览功能，包括分类（文件夹树）和搜索。

#### 功能清单

- [ ] Vue 3 + Vite + TypeScript 项目初始化
- [ ] Tailwind CSS 4 样式集成
- [ ] Vue Router 路由配置 (4 个页面)
- [ ] Pinia 状态管理 (notes store, ui store)
- [ ] Cloudflare Pages Functions API 层
  - [ ] GitHub API 封装 (`functions/_shared/github.ts`)
  - [ ] `GET /api/notes` — 获取目录树
  - [ ] `GET /api/notes/:path` — 获取笔记内容
  - [ ] `GET /api/search?q=` — 搜索笔记
  - [ ] KV 缓存集成
- [ ] `wrangler.toml` 配置 + KV 绑定
- [ ] 文件夹树组件 (`FolderTree.vue`) — 递归展示目录结构
- [ ] 笔记列表组件 (`NoteList.vue`) — 当前目录下的笔记
- [ ] 笔记查看组件 (`NoteViewer.vue`) — Markdown 渲染 + 代码高亮
- [ ] 搜索组件 (`SearchBar.vue`) — 防抖搜索 + 结果高亮
- [ ] 主布局 (`MainLayout.vue`) — 桌面侧栏 + 移动端汉堡菜单
- [ ] 首页 (`HomePage.vue`) — 笔记浏览入口
- [ ] 笔记详情页 (`NotePage.vue`) — 只读查看模式
- [ ] 搜索结果页 (`SearchPage.vue`)
- [ ] frontmatter 解析/渲染 (`markdown.ts`)
- [ ] 错误处理: 404 笔记不存在、API 限流提示、加载骨架屏
- [ ] 部署到 Cloudflare Pages

#### 依赖包

```
vue, vue-router, pinia, @vueuse/core
tailwindcss, @tailwindcss/vite
@vitejs/plugin-vue, vite
typescript, vue-tsc
markdown-it, highlight.js
wrangler (dev)
```

---

### P1: PWA 支持

**目标**: 离线可用, 可安装到设备。

#### 功能清单

- [ ] 集成 vite-plugin-pwa
- [ ] Web App Manifest 配置 (应用名、主题色、图标)
- [ ] Service Worker 注册与更新策略 (`registerType: 'prompt'`)
- [ ] 运行时缓存策略: `/api/notes` CacheFirst, 5 分钟过期
- [ ] 静态资源预缓存 (JS/CSS/HTML/图片/字体)
- [ ] PWA 图标集 (192x192, 512x512, apple-touch-icon, favicon)
- [ ] 离线状态指示器 (useOnline composable)
- [ ] 离线查看已缓存笔记
- [ ] 更新提示 UI ("新版本可用, 点击更新")
- [ ] Lighthouse PWA 审计通过

#### 依赖包

```
vite-plugin-pwa (新增)
```

---

### P2: 图片支持与编辑 (PR)

**目标**: 支持图片上传, 编辑提交为 PR。

#### 功能清单

- [ ] Tiptap 编辑器集成 (`@tiptap/vue-3`, `@tiptap/starter-kit`, `@tiptap/markdown`)
- [ ] 编辑器工具栏 (加粗/斜体/标题/列表/代码/引用/链接)
- [ ] Markdown 双向转换 (`contentType: 'markdown'`)
- [ ] 查看模式 ↔ 编辑模式切换 (NotePage)
- [ ] 图片上传与存储
  - [ ] `POST /api/images` — 上传图片到 GitHub 仓库 `assets/` 目录
  - [ ] 图片通过 GitHub raw URL 引用
  - [ ] 拖拽上传 + 粘贴上传
- [ ] 编辑保存流程
  - [ ] Pages Function: 创建分支 → 提交文件 → 开 PR
  - [ ] PR 状态提示组件 (`PRStatus.vue`) — 显示 PR 链接
- [ ] 创建新笔记 (`NewNotePage.vue`)
  - [ ] 文件夹选择 + 文件名 + 标题 + 标签
  - [ ] frontmatter 自动生成
- [ ] 删除笔记 (确认对话框 → 创建删除 PR)
- [ ] IP 频率限制实现
- [ ] 路径校验与内容大小限制
- [ ] SHA 冲突检测 (防止并发覆盖)

#### 依赖包

```
@tiptap/vue-3, @tiptap/starter-kit, @tiptap/pm, @tiptap/markdown (新增)
```

---

### P3: Agent Reviewer

**目标**: 自动化 PR 审核, 辅助维护者判断内容质量。

#### 功能清单

- [ ] GitHub Actions 集成
  - [ ] PR 创建时自动触发 workflow
  - [ ] 读取 PR diff (变更内容)
- [ ] AI 内容审核
  - [ ] 调用 AI API (Claude / OpenAI) 分析 PR 内容
  - [ ] 检测: 格式规范、拼写错误、内容相关性、垃圾/滥用内容
  - [ ] 自动在 PR 上添加审核评论
- [ ] 自动标签
  - [ ] 根据内容自动打标签: `content-type: guide/log/reference`
  - [ ] 根据变更大小标记: `size: small/medium/large`
- [ ] 审核报告
  - [ ] 自动生成 PR 摘要
  - [ ] 代码/内容质量评分
  - [ ] 建议改进点
- [ ] (可选) 自动合并策略
  - [ ] 小修改 (拼写修正等) 且评分通过 → 自动 approve
  - [ ] 大变更 → 等待人工审核

#### 基础设施

- GitHub Actions workflow (`.github/workflows/review.yml`)
- AI API Key 配置 (GitHub Secrets)
- Prompt 模板管理

---

## 验证方案

### MVP 验证
- 本地: `wrangler pages dev` + Vite dev server 联调
- API: curl 测试 `/api/notes` 返回正确目录树
- 搜索: 验证搜索关键词匹配和高亮
- 部署: Cloudflare Pages 构建成功, 线上可访问

### P1 验证
- Chrome DevTools > Application > Service Workers 确认注册
- Lighthouse PWA 审计 100 分
- 离线模式下可查看已缓存笔记
- 真机安装 PWA 到主屏幕

### P2 验证
- 编辑笔记后 GitHub 上出现对应 PR
- 图片上传后 PR 中包含 `assets/` 目录下的新文件
- 并发编辑时 SHA 冲突检测正常
- PR 状态提示显示正确链接

### P3 验证
- 提交 PR 后 GitHub Actions 自动运行
- AI 审核评论出现在 PR 中
- 自动标签正确分类
