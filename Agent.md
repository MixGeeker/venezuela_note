---
title: Agent Guide
publish: false
---

# Agent Guide

## 使用范围与目标

这是一份给「内容写作者 / 自动化 Agent」的操作手册。

你不需要知道站点底层实现细节，也不需要了解应用代码仓库。你只需要把这个仓库当作一个“可公开发布的 Markdown 内容库”，按本文规则写作与维护即可。

本手册目标：

- 让新接手的人在不依赖口头背景的情况下独立完成内容工作
- 让自动化 Agent 按统一标准产出可发布内容
- 降低断链、误发布、路径漂移和敏感信息泄漏的风险

## 快速心智模型（不依赖系统背景）

把仓库理解成一个“静态内容源”：

- 仓库中的 Markdown 和附件会被读取并展示到网站
- 文件路径会影响访问地址与站内跳转
- 大多数 `.md` 默认会公开
- 链接不会被自动修复，错误会原样暴露

因此你只需坚持 4 条原则：

1. **路径稳定**：已发布路径尽量不改。
2. **链接真实**：只链接真实存在的目标。
3. **状态明确**：草稿就标草稿，不公开就明确隐藏。
4. **内容安全**：绝不提交任何密钥或隐私数据。

## 仓库适合与不适合的内容

适合放：

- Markdown 笔记、手册、FAQ、操作指南
- 知识库文章、项目文档、变更记录
- Obsidian 风格双链内容
- 图片、PDF、音视频等辅助附件
- 轻量站点配置 `site.yml`

不适合放：

- token、密码、私钥、凭据、个人敏感信息
- 需要权限隔离的内部资料
- 大量超大媒体或不必要二进制文件
- 应用代码、依赖目录、构建产物
- 依赖服务端执行逻辑的动态内容

## 可发布性规则（最关键）

默认行为：普通 `.md` 会被视为可发布内容。

如需不公开，二选一：

```yaml
---
publish: false
---
```

```yaml
---
draft: true
---
```

另外，以下路径通常不会被索引：

- `.obsidian/`
- `.trash/`
- 任意以 `.` 开头的目录片段

## 目录与命名规范

推荐结构（可按项目实际微调）：

```text
README.md
site.yml
guides/
  getting-started.md
  deployment.md
notes/
  topic-a.md
assets/
  screenshots/
  diagrams/
```

命名规则：

- 文件名使用可读语义：`deploy-cloudflare.md` 优于 `new.md`
- 路径尽量短且稳定，避免频繁重命名
- 同一主题集中在一个主文档，避免多份“真相源”

## Frontmatter 标准

推荐模板：

```yaml
---
title: 页面标题
tags: [guide, deploy]
aliases: [旧名称, 常见别名]
permalink: custom/path
publish: true
---
```

字段说明：

- `title`：页面展示标题（建议总是填写）
- `tags`：用于聚合与检索
- `aliases` / `alias`：历史命名或常用别称
- `permalink`：需要固定外链时再使用
- `publish: false`：明确不发布
- `draft: true`：草稿状态

默认发布条件：未设置 `publish: false` 且未设置 `draft: true`。

## 写作与结构规范

推荐：

- 一篇文档只解决一个主问题
- 开头先给结论或适用场景，再展开步骤
- 标题层级按 `#` -> `##` -> `###` 递进
- 段落短句化，步骤操作用有序列表
- 示例命令、路径、配置单独成块

避免：

- 无意义标题或文件名（如 `test.md`）
- 把多个无关主题混在一篇文档
- 大量复制粘贴导致多处内容不一致
- 改了路径但不更新引用

## 链接与引用规范

支持 Obsidian 双链：

```markdown
[[另一篇笔记]]
[[guides/deployment|部署说明]]
[[README#快速开始]]
```

支持 Markdown 链接：

```markdown
[部署说明](guides/deployment.md)
```

支持附件嵌入：

```markdown
![[assets/screenshot.png]]
![截图](assets/screenshot.png)
```

链接规则：

- 优先链接稳定主文档，不链接临时草稿
- 使用相对路径，减少环境依赖
- 改名/移动文件时，同步修复所有引用
- 不确定目标是否存在时，先搜索再写链接

## 附件规范

常见可识别类型：

- 图片：`avif`、`bmp`、`gif`、`ico`、`jpeg`、`jpg`、`png`、`svg`、`webp`
- 音频：`flac`、`m4a`、`mp3`、`ogg`、`wav`
- 视频：`mov`、`mp4`、`webm`
- 文档：`pdf`

实践建议：

- 附件放 `assets/` 或与文档相邻目录
- 文件名语义化：`login-page-error.png` 优于 `1.png`
- 不提交无用大文件；必要时先压缩再入库

## site.yml 约束

仓库根目录可放 `site.yml`：

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

当前使用简单 `key: value` 形式，避免复杂嵌套结构。`title`、`short_name`、`description`、颜色、语言和图标会用于页面标题、PWA 安装信息、manifest、favicon 和 apple-touch-icon。

图标推荐放在内容仓库的 `assets/` 目录。最小配置只需要 `icon: assets/app-icon.png`，系统会把它同时用于普通图标、favicon、apple 图标和 maskable 图标；需要精细控制时再补充 `favicon`、`apple_touch_icon`、`maskable_icon`。推荐使用正方形 PNG 或 SVG，maskable 图标应预留安全边距。

### `site.yml` 参数契约（建议）

为保证“空仓库可自生长”，把参数分成两类：

- **站点消费参数**：供网站读取并展示
- **Agent 协作参数**：供自动化 Agent 读规则并生成内容（即使站点暂不消费，也可安全存在）

#### A. 站点消费参数（建议至少提供）

- `title`：站点标题（必填）
- `description`：站点简介（必填）
- `short_name`：PWA 安装后的短名称（可选，默认跟随 `title`）
- `icon`：默认 PWA 图标路径（可选，推荐放在 `assets/`）
- `favicon` / `apple_touch_icon` / `maskable_icon`：按平台细分的图标路径（可选）
- `theme_color` / `background_color`：PWA 主题色和启动背景色（可选，十六进制颜色）
- `lang`：站点主语言，如 `zh-CN`

#### B. Agent 协作参数（推荐）

- `lang`：主语言，如 `zh-CN`
- `seed_enabled`：是否允许首次自动初始化，`true` / `false`
- `seed_topics`：初始化主题，逗号分隔，如 `getting-started,faq,runbook`
- `seed_docs_per_topic`：每个主题初始文档数量（建议 `1`）
- `seed_include_home`：是否生成首页入口文档，`true` / `false`
- `seed_include_changelog`：是否生成变更记录文档，`true` / `false`
- `draft_by_default`：新建文档默认是否草稿，`true` / `false`
- `default_tags`：新文档默认标签，逗号分隔，如 `notes,guide`
- `owner`：内容维护者标识（团队名或用户名）
- `review_checklist`：启用提交前检查，`strict` / `basic`

### 推荐最小可生长 `site.yml` 模板

```yaml
title: Notes
description: Team knowledge base
short_name: Notes
icon: assets/app-icon.png
theme_color: "#2563eb"
background_color: "#f9fafb"
lang: zh-CN
seed_enabled: true
seed_topics: getting-started,faq,runbook
seed_docs_per_topic: 1
seed_include_home: true
seed_include_changelog: true
draft_by_default: false
default_tags: notes,guide
owner: team
review_checklist: strict
```

说明：

- 若 `site.yml` 不存在，Agent 应按上述模板创建默认文件（允许按任务微调标题和描述）
- 若存在但缺失关键参数，Agent 应补齐缺省值，不覆盖用户已填写值

## 空仓库冷启动协议（Auto-Grow）

当仓库几乎为空（仅有 `Agent.md` / `README` / `.git*` 等基础文件）时，自动化 Agent 必须执行以下初始化流程。

### 1) 初始化结构

至少创建：

- `site.yml`
- `README.md`
- `guides/getting-started.md`
- `guides/faq.md`
- `notes/changelog.md`
- `assets/.gitkeep`（或等效占位文件）

### 2) 初始化内容

`README.md` 必须包含：

- 仓库用途说明
- 内容目录入口链接
- 新手阅读顺序（至少 3 步）
- 贡献与发布简要说明

`guides/getting-started.md` 必须包含：

- 适用人群
- 前置条件
- 5~10 步上手流程
- 验证是否完成上手

`guides/faq.md` 必须包含：

- 至少 5 个高频问题
- 每个问题给出可执行回答（非口号式）

`notes/changelog.md` 必须包含：

- 版本或日期维度的变更记录骨架
- “新增 / 修复 / 调整”三个小节

### 3) 初始化 frontmatter 规则

除明确设为草稿的文档外，初始化文档默认：

- `title` 必填
- `tags` 至少 1 个
- `publish` 按 `draft_by_default` 反向设置

当 `draft_by_default: true` 时，新文档默认：

```yaml
draft: true
```

### 4) 初始化链接网络

冷启动阶段必须确保：

- `README.md` 至少链接到 `guides/getting-started.md`、`guides/faq.md`、`notes/changelog.md`
- 每个指南页至少有 1 个回链到 `README.md`
- 不允许出现明显空目标链接

### 5) 初始化验收门槛

初始化完成才算成功，需同时满足：

- 所有必需文件均已创建
- 关键文档均可独立阅读
- 入口链接可达
- 无敏感信息
- 文档状态（公开/草稿）明确

若任一条件不满足，Agent 不应结束任务，应继续补齐直到通过。

## 自动化 Agent 执行手册（可直接照做）

### 输入任务后先做这 5 步

1. 明确任务类型：新增 / 改写 / 修复断链 / 重构目录 / 批量清理
2. 扫描影响范围：目标文件、被引用文件、附件、入口文档
3. 标注发布状态：是否应公开，是否需 `draft` 或 `publish: false`
4. 设计最小变更集：尽量小步、可回滚
5. 预设验收标准：完成后如何确认“真的可用”

### 任务类型决策规则

- **新增文档**：先确认落点目录，再建文件和 frontmatter
- **改写内容**：保持原 URL，优先原地增强
- **改文件名/路径**：先评估引用面，批量修链再提交
- **删文档**：先确认无关键引用，必要时保留重定向说明页
- **批量操作**：拆成多次提交，避免一次性大爆炸变更

### 标准产出模板

新增文档建议骨架：

```markdown
---
title: 文档标题
tags: [topic]
publish: true
---

# 文档标题

## 适用场景

## 前置条件

## 操作步骤

## 验证方法

## 常见问题
```

## 质量门禁（提交前必须全部通过）

- 文档可独立阅读，不依赖“口头背景”
- frontmatter 完整且发布状态正确
- 标题层级无跳级，目录结构清晰
- 所有新增链接目标存在，关键旧链接未被破坏
- 附件路径真实可达，命名可读
- 无密钥、凭据、隐私、内部敏感信息
- 变更说明清楚：为什么改、改了什么、影响哪里

## 高风险操作与防错

高风险操作：

- 大规模重命名或移动目录
- 批量删除文档
- 修改被广泛引用的入口页（如 README、导航页）
- 把草稿改为公开

防错要求：

- 先做影响分析，再执行改动
- 一次只做一种高风险动作
- 必须附带回滚方案（至少能恢复旧路径和关键链接）
- 不确定时先停下来，标注假设并请求确认

## 协作与提交建议

推荐流程：

1. 基于最新 `main` 新建分支
2. 完成单一主题改动
3. 本地自查（按质量门禁）
4. 提交 PR 并写明影响范围
5. Review 通过后合并

提交建议：

- 一个提交解决一个明确问题
- 改路径必须同提交修复引用
- 不要 force push 到 `main`
- 不夹带与任务无关改动

## 禁止事项（硬约束）

- 禁止提交或复述任何密钥、token、密码、私钥
- 禁止无说明地大规模删除内容
- 禁止随意改动已发布路径
- 禁止把草稿直接改公开（除非任务明确要求）
- 禁止提交应用代码、依赖目录或构建产物

## 失败兜底策略

当你无法确认某个改动是否安全时：

1. 保持现有已发布路径不变
2. 用最小改动交付可验证结果
3. 在变更说明中写清楚不确定点与建议下一步

优先“可回滚的正确”，而不是“激进但不可控的完整”。
