# Codex 聊天记录管理应用 - 项目规划

## 项目目标
开发一个轻量级 Windows 桌面应用，用于管理和删除 Codex 的聊天会话记录。

## 技术栈
- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **桌面框架**: **Vokex** (超轻量，基于 Rust WebView)
- **样式**: CSS3

## Codex 会话目录结构 ✅ 已确认

### 目录格式
```
C:\Users\{用户名}\.codex\sessions\
  └── YYYY/           # 年份目录
      └── MM/         # 月份目录
          └── DD/     # 日期目录
              └── rollout-YYYY-MM-DDTHH-MM-SS-{会话ID}.jsonl
```

### 文件名格式
```
rollout-2026-05-07T09-38-38-019e0016-3e0e-7a70-850b-a8eb4fc49246.jsonl
```

### 关键信息提取
| 信息 | 来源 | 示例 |
|------|------|------|
| **日期时间** | 文件名前半部分 | `rollout-2026-05-07T09-38-38` |
| **会话ID** | 文件名后半部分 | `019e0016-3e0e-7a70-850b-a8eb4fc49246` |
| **完整路径** | 目录 + 文件名 | `sessions/2026/05/07/rollout-...jsonl` |

### JSONL 格式
- **JSONL** = JSON Lines，每行一个完整的 JSON 对象
- 每个文件包含多条对话记录
- 需要逐行解析

## 核心需求
| 功能 | 优先级 | Vokex API |
|------|--------|-----------|
| 会话浏览 | P0 | `fs.glob()` 搜索 `*.jsonl` |
| 会话预览 | P0 | `fs.readFile()` 读取 JSONL |
| 会话删除 | P0 | `fs.deleteFile()` + `dialog.showMessageBox()` |
| 会话搜索 | P1 | `fs.glob()` 模式匹配 |
| 按时间筛选 | P1 | `fs.stat()` 获取修改时间 |
| 批量管理 | P1 | 组合上述 API |
| 会话导出 | P2 | `fs.writeFile()` |

## 项目阶段

### Phase 1: 项目初始化
- [x] 创建 Vite + Vue 项目 ✅
- [ ] 安装 `vokex.app` 依赖
- [ ] 配置 `vite.config.ts` + vokexPlugin
- [ ] 创建基础文件夹结构
- [ ] 测试 Vokex API 连通性

### Phase 2: 会话列表功能
- [ ] 实现会话目录扫描（`fs.glob()` 搜索 `*.jsonl`）
- [ ] 创建 `SessionList.vue` 组件
- [ ] 实现会话列表展示
- [ ] 显示会话基本信息（从文件名解析：日期、时间、会话ID）

### Phase 3: 会话预览功能
- [ ] 实现会话文件读取（`fs.readFile()`）
- [ ] 创建 `SessionDetail.vue` 组件
- [ ] 解析 JSONL 数据（逐行解析 JSON）
- [ ] 实现对话历史展示

### Phase 4: 会话删除功能 ⭐
- [ ] 实现删除确认对话框（`dialog.showMessageBox()`）
- [ ] 实现文件删除（`fs.deleteFile()`）
- [ ] 刷新会话列表
- [ ] 添加删除成功/失败提示

### Phase 5: 增强功能
- [ ] 会话搜索（文件名关键词）
- [ ] 按时间范围筛选
- [ ] 批量选择和删除
- [ ] 会话导出为 Markdown

### Phase 6: UI/UX 优化
- [ ] 加载状态动画
- [ ] 错误处理和提示
- [ ] 响应式布局
- [ ] 原生菜单栏（`menu.setApplicationMenu()`）
- [ ] 右键菜单支持

### Phase 7: 测试和发布
- [ ] 功能测试
- [ ] 打包构建（`npm run build`）
- [ ] 生成 release/*.exe

## 详细实现计划

### Day 1-2: 基础搭建
1. 安装和配置 Vokex
2. 搭建基础组件结构
3. 实现会话列表功能（扫描 JSONL 文件）
4. 解析文件名提取日期和会话ID

### Day 3-4: 核心功能
1. 会话详情查看（JSONL 逐行解析）
2. 会话删除功能
3. 确认对话框
4. 列表刷新机制

### Day 5-6: 增强功能
1. 搜索和筛选
2. 批量操作
3. 导出功能
4. UI 优化

### Day 7: 收尾
1. 测试和修复
2. 打包发布
3. 文档编写

## 关键文件清单

### 配置类
- `vite.config.ts` - Vite + Vokex 插件配置
- `package.json` - 依赖管理

### 源代码
- `src/main.ts` - Vue 入口
- `src/App.vue` - 根组件
- `src/api/sessions.ts` - 会话管理 API 封装
- `src/types/session.ts` - TypeScript 类型定义
- `src/components/SessionList.vue` - 会话列表组件
- `src/components/SessionDetail.vue` - 会话详情组件
- `src/components/ConfirmDialog.vue` - 确认对话框组件
- `src/utils/parser.ts` - 文件名和 JSONL 解析工具

## Vokex API 使用计划

### 文件系统操作
```typescript
import { fs, app } from "vokex.app";

// 获取会话目录
const sessionsPath = `${await app.getPath("home")}/.codex/sessions`;

// 扫描所有 JSONL 文件
const files = await fs.glob({
  pattern: "**/*.jsonl",
  cwd: sessionsPath,
  absolute: true
});

// 读取会话文件（JSONL 格式）
const content = await fs.readFile(filePath);
// JSONL 需要逐行解析：
// const lines = content.split('\n');
// const messages = lines.filter(line => line.trim()).map(line => JSON.parse(line));

// 删除会话
await fs.deleteFile(filePath);

// 获取文件信息
const stat = await fs.stat(filePath);
```

### 对话框
```typescript
import { dialog } from "vokex.app";

// 删除确认
const result = await dialog.showMessageBox({
  type: "warning",
  title: "确认删除",
  message: "确定要删除这个会话吗？",
  buttons: ["取消", "确定删除"]
});
```

### 原生菜单
```typescript
import { menu } from "vokex.app";

await menu.setApplicationMenu([
  { type: 'submenu', label: '文件', submenu: [
    { id: 'refresh', label: '刷新列表' },
    { id: 'export', label: '导出选中' },
    { type: 'separator' },
    { type: 'native', nativeLabel: 'quit' },
  ]},
]);
```

## 注意事项

### ⚠️ 安全性
- 删除操作不可逆，需要多重确认
- 添加操作日志记录

### ⚠️ 兼容性
- Vokex 目前仅支持 Windows
- 依赖 WebView2 运行时

### ⚠️ 性能
- JSONL 文件可能很大，需要异步加载
- 列表虚拟滚动（如果会话很多）
- 大型 JSONL 文件需要流式解析

## 成功标准
- ✅ 能够扫描 `.codex/sessions` 下所有 `*.jsonl` 文件
- ✅ 能够解析文件名提取日期和会话ID
- ✅ 能够预览 JSONL 内容
- ✅ 能够安全删除会话
- ✅ 应用打包后 < 5MB
- ✅ 启动时间 < 2秒
