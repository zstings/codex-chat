# 项目调研笔记

## 1. Vokex 框架 - ✅ 确认使用

### 核心信息
- **GitHub**: https://github.com/zstings/vokex
- **npm**: https://www.npmjs.com/package/vokex.app
- **当前版本**: 0.1.5
- **许可证**: MIT
- **平台支持**: 目前仅支持 Windows

### 框架特点
| 特性 | 说明 |
|------|------|
| **超轻量** | 构建产物 ~1.8MB，仅依赖系统 WebView |
| **零 Rust 门槛** | npm 安装即可，无需 Rust 工具链 |
| **Vite 集成** | vite-plugin 自动接管开发和构建 |
| **单文件输出** | 资源压缩嵌入可执行文件 |
| **API 丰富** | 14 个模块，112 个公开方法 |
| **TypeScript** | 完整的类型支持 |
| **安全沙箱** | 远端页面默认禁用危险 API |

### 核心 API 模块

#### 1. **fs** - 文件系统（关键！）
```typescript
import { fs } from "vokex.app";

// 读取会话文件
const content = await fs.readFile("session.json");

// 删除会话
await fs.deleteFile("session.json");

// 列出目录
const entries = await fs.readDir(".codex/sessions");

// 搜索文件（最常用）
await fs.glob({
  pattern: "**/*.jsonl",  // 递归搜索所有 JSONL 文件
  cwd: sessionsPath,
  absolute: true
});
```

#### 2. **dialog** - 对话框
```typescript
import { dialog } from "vokex.app";

// 确认删除对话框
const result = await dialog.showMessageBox({
  type: "warning",
  title: "确认删除",
  message: "确定要删除这个会话吗？",
  buttons: ["取消", "确定删除"]
});
```

#### 3. **app** - 应用管理
```typescript
import { app } from "vokex.app";

// 获取用户目录
const homePath = await app.getPath("home");
```

#### 4. **menu** - 原生菜单
```typescript
import { menu } from "vokex.app";

await menu.setApplicationMenu([
  { type: 'submenu', label: '文件', submenu: [
    { id: 'delete', label: '删除会话' },
    { type: 'separator' },
    { type: 'native', nativeLabel: 'quit' },
  ]},
]);
```

## 2. Codex 会话目录结构 ✅ 已确认

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

### 文件名解析正则
```typescript
// 文件名格式: rollout-YYYY-MM-DDTHH-MM-SS-{UUID}.jsonl
// 示例: rollout-2026-05-07T09-38-38-019e0016-3e0e-7a70-850b-a8eb4fc49246.jsonl

const FILENAME_REGEX = /^rollout-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-([a-f0-9-]+)\.jsonl$/i;

// 解析结果:
// - 年: 2026
// - 月: 05
// - 日: 07
// - 时: 09
// - 分: 38
// - 秒: 38
// - 会话ID: 019e0016-3e0e-7a70-850b-a8eb4fc49246
```

### 完整路径示例
```
C:\Users\用户名\.codex\sessions\2026\05\07\rollout-2026-05-07T09-38-38-019e0016-3e0e-7a70-850b-a8eb4fc49246.jsonl
```

## 3. JSONL 格式解析

### 什么是 JSONL
- **JSONL** = JSON Lines，每行一个完整的 JSON 对象
- 文件扩展名：`.jsonl`
- 每行以 `\n` 分隔
- 适合处理大量数据

### 示例内容
```jsonl
{"role":"user","content":"你好","timestamp":"2026-05-07T09:38:38Z"}
{"role":"assistant","content":"你好！有什么可以帮助你的吗？","timestamp":"2026-05-07T09:38:40Z"}
{"role":"user","content":"帮我写一个函数","timestamp":"2026-05-07T09:38:45Z"}
{"role":"assistant","content":"好的，这是一个简单的函数...","timestamp":"2026-05-07T09:38:50Z"}
```

### 解析代码
```typescript
function parseJsonlFile(content: string) {
  const lines = content.split('\n');
  const messages = [];

  for (const line of lines) {
    if (line.trim()) {
      try {
        const message = JSON.parse(line);
        messages.push(message);
      } catch (error) {
        console.error('JSON 解析失败:', error);
      }
    }
  }

  return messages;
}
```

### 消息格式
```typescript
interface CodexMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}
```

## 4. 技术栈总结

| 层级 | 技术 |
|------|------|
| **前端框架** | Vue 3 + TypeScript |
| **构建工具** | Vite |
| **桌面框架** | Vokex (wry + tao) |
| **样式方案** | CSS3 |
| **状态管理** | Pinia (可选，Vokex API 足够轻量) |

## 5. 项目结构设计

```
codex-chat/
├── public/
│   └── icon.ico          # 应用图标
├── src/                  # 前端源码
│   ├── main.ts          # Vue 入口
│   ├── App.vue          # 根组件
│   ├── api/             # Vokex API 封装
│   │   └── sessions.ts  # 会话管理 API
│   ├── components/      # Vue 组件
│   │   ├── SessionList.vue
│   │   ├── SessionDetail.vue
│   │   └── ConfirmDialog.vue
│   ├── types/          # TypeScript 类型定义
│   │   └── session.ts
│   └── utils/          # 工具函数
│       └── parser.ts   # JSONL 和文件名解析
├── vite.config.ts      # Vite 配置 + Vokex 插件
├── index.html
└── package.json
```

## 6. 核心实现要点

### 6.1 文件扫描
```typescript
import { fs, app } from "vokex.app";

// 获取会话目录
const sessionsPath = `${await app.getPath("home")}/.codex/sessions`;

// 扫描所有 JSONL 文件（递归）
const files = await fs.glob({
  pattern: "**/*.jsonl",
  cwd: sessionsPath,
  absolute: true
});
```

### 6.2 文件名解析
```typescript
// 从绝对路径提取信息
// 输入: "C:\Users\用户名\.codex\sessions\2026\05\07\rollout-2026-05-07T09-38-38-019e0016-3e0e-7a70-850b-a8eb4fc49246.jsonl"

function parseSessionFile(filePath: string) {
  const filename = filePath.split(/[/\\]/).pop()!;
  const match = filename.match(/^rollout-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-([a-f0-9-]+)\.jsonl$/i);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second, sessionId] = match;

  return {
    sessionId,
    dateTime: `${year}-${month}-${day}T${hour}:${minute}:${second}`,
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}:${second}`,
    fullPath: filePath,
    filename
  };
}
```

### 6.3 JSONL 内容读取
```typescript
async function loadSessionContent(filePath: string) {
  try {
    const content = await fs.readFile(filePath);
    const messages = parseJsonlFile(content);
    return messages;
  } catch (error) {
    console.error('读取会话失败:', error);
    return [];
  }
}
```

### 6.4 删除确认流程
```typescript
async function deleteSession(filePath: string) {
  const result = await dialog.showMessageBox({
    type: "warning",
    title: "确认删除",
    message: "确定要删除这个会话吗？此操作不可撤销。",
    buttons: ["取消", "确定删除"]
  });

  if (result.response === 1) {
    try {
      await fs.deleteFile(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  return { success: false, cancelled: true };
}
```

## 7. 性能优化策略

### 7.1 文件扫描
- 使用 `fs.glob()` 递归搜索，比手动递归读取目录快
- 限制搜索深度或使用缓存

### 7.2 大文件处理
- JSONL 文件可能很大（几MB）
- 使用流式读取或分页加载
- 限制预览显示的消息数量（如只显示前100条）

### 7.3 列表渲染
- 如果会话很多（>1000），考虑虚拟滚动
- 使用 `v-virtual-scroller` 或类似库

## 8. 待验证项

- [x] Codex 会话目录实际路径 ✅
- [x] 文件名格式 ✅
- [x] JSONL 数据格式（推测，待验证）
- [ ] 会话 ID 的具体含义
- [ ] 文件大小和数量限制

## 9. 参考资料

- [Vokex npm 页面](https://www.npmjs.com/package/vokex.app)
- [Vokex GitHub](https://github.com/zstings/vokex)
- [JSONL 格式说明](https://jsonlines.org/)
