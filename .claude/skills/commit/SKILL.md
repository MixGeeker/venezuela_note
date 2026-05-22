## 提交当前内容

### 核心原则

**自动修复优先，逻辑变更才问人。** 检查失败时先尝试自动修复，只有涉及业务逻辑决策时才暂停询问用户。

自动修复范围：格式问题、缺失 import、类型拼写错误、路径变更导致的 import 失效。
询问范围：API 响应结构变更、路由逻辑修改、环境变量增删。

---

### 阶段 1：前置检查（失败先自动修复）

#### 1.1 Typecheck

```
npm run typecheck
```

失败时先分析错误类型：

- **机械性错误**（缺失 import、类型名拼写、路径失效等）→ 直接修复后重新 typecheck
- **接口契约/类型语义变化** → 询问用户是否为故意变更
- 重试最多 3 次，仍失败则暂停报告

#### 1.2 Build

```
npm run build
```

验证构建产物正常生成。失败时结合 typecheck 错误一并分析修复。

---

### 阶段 2：变更分析

#### 2.1 获取变更信息

并行执行：

```
git diff --name-only HEAD
git diff --staged --name-only
git status --porcelain
```

#### 2.2 结构检测

对 `git diff` 输出检查以下规则，命中则**询问用户是否为故意行为**：

| 检测项 | 检测方式 |
|--------|----------|
| `wrangler.toml` 绑定变更 | diff 中 KV namespace、环境变量等绑定被修改 |
| `.dev.vars` 加入暂存 | `.dev.vars` 出现在暂存文件中（含 token，不应提交） |
| API 路径变更 | `functions/api/` 下路由文件增删或路径逻辑修改 |
| `src/types/index.ts` 修改 | 核心类型定义变更，影响全局 |

#### 2.3 大文件/二进制产物检测

对暂存区文件检查，命中则**自动排除不询问**：

**扩展名黑名单**：`.exe` `.dll` `.tar` `.zip` `.gz` `.7z` `.rar` `.pdf` `.jpg` `.jpeg` `.png` `.webp` `.gif` `.mp4` `.ico` `.bin` `.node`

**路径黑名单**（包含即命中）：`dist/` `node_modules/` `.wrangler/` `.env` `.dev.vars` `*.tsbuildinfo` `*.log`

**大小检测**：未命中路径黑名单的文件，超过 **2 MB** 标记警告并排除。

排除操作：`git reset HEAD -- <file>`，向用户报告被排除的文件列表。

---

### 阶段 3：暂存与提交

#### 3.1 智能暂存

- **不使用** `git add -A`
- 按文件逐一 `git add`，跳过被阶段 2.3 排除的文件
- 合规的 untracked 文件一并暂存

#### 3.2 生成 Commit Message

格式：`type: 中文描述`

- **type**（从 diff 推断）：`feat`(新功能) `fix`(修复) `docs` `chore` `refactor` `style` `build`
- **描述**用简体中文，概括变更意图而非罗列文件

用 Heredoc 提交：

```bash
git commit -m "$(cat <<'EOF'
type: 中文描述

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### 阶段 4：推送

直接推送：

```bash
git push
```

若远程有新提交导致 push 被拒：`git pull --rebase` 后重试一次。

---

### 阶段 5：完成报告

提交成功后简洁报告：

```
✓ 已提交并推送
  Commit: <hash> — type: 描述
  Branch: <branch>
```

若过程中询问了用户并得到确认，报告中注明用户已确认的例外项。
