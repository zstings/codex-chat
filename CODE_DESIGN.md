# Codex 会话管理器 - 详细代码设计

## 项目概述

基于 Vokex + Vue 3 的轻量级 Windows 桌面应用，用于管理和删除 Codex 聊天会话记录。

## 技术栈

- **前端**: Vue 3 + TypeScript + Composition API
- **构建**: Vite + vokexPlugin
- **桌面**: Vokex (fs, dialog, menu API)
- **样式**: 原生 CSS3（无框架依赖）

---

## 1. 项目文件结构

```
codex-chat/
├── src/
│   ├── main.ts                    # Vue 应用入口
│   ├── App.vue                    # 根组件
│   ├── api/
│   │   └── sessions.ts          # 会话管理 API 封装
│   ├── components/
│   │   ├── SessionList.vue       # 会话列表组件
│   │   ├── SessionDetail.vue     # 会话详情组件
│   │   └── LoadingSpinner.vue    # 加载动画
│   ├── types/
│   │   └── session.ts           # TypeScript 类型定义
│   └── utils/
│       └── parser.ts            # 文件名和 JSONL 解析
├── vite.config.ts                # Vite 配置
├── index.html
└── package.json
```

---

## 2. 类型定义 (types/session.ts)

```typescript
// 单个会话元信息（从文件名解析）
export interface SessionMeta {
  sessionId: string // 会话 ID
  filename: string // 完整文件名
  fullPath: string // 绝对路径
  dateTime: string // ISO 日期时间
  date: string // 日期 YYYY-MM-DD
  time: string // 时间 HH:MM:SS
  year: string // 年份
  month: string // 月份
  day: string // 日期
}

// 单条消息（从 JSONL 解析）
export interface CodexMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  metadata?: Record<string, any>
}

// 完整会话数据
export interface Session extends SessionMeta {
  messages: CodexMessage[]
  messageCount: number // 消息数量
  preview?: string // 预览文本（第一条用户消息）
}

// 列表项（显示在列表中）
export interface SessionListItem extends SessionMeta {
  messageCount: number
  preview: string
}

// 删除结果
export interface DeleteResult {
  success: boolean
  error?: string
  cancelled?: boolean
}

// 搜索/筛选选项
export interface FilterOptions {
  keyword?: string // 搜索关键词
  startDate?: string // 开始日期
  endDate?: string // 结束日期
  sortBy?: 'date' | 'time' | 'size' // 排序字段
  sortOrder?: 'asc' | 'desc' // 排序方向
}
```

---

## 3. 解析工具 (utils/parser.ts)

### 3.1 文件名解析

```typescript
// 文件名正则: rollout-YYYY-MM-DDTHH-MM-SS-{UUID}.jsonl
const SESSION_REGEX =
  /^rollout-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-([a-f0-9-]+)\.jsonl$/i

/**
 * 解析会话文件名，提取元信息
 * @param filePath - 完整文件路径或文件名
 * @returns 解析后的会话元信息，或 null（如果格式不匹配）
 */
export function parseSessionFilename(filePath: string): SessionMeta | null {
  // 提取文件名（处理 Windows/Unix 路径分隔符）
  const filename = filePath.split(/[/\\]/).pop() || ''
  const match = filename.match(SESSION_REGEX)

  if (!match) {
    return null
  }

  const [, year, month, day, hour, minute, second, sessionId] = match

  return {
    sessionId,
    filename,
    fullPath: filePath,
    dateTime: `${year}-${month}-${day}T${hour}:${minute}:${second}`,
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}:${second}`,
    year,
    month,
    day,
  }
}

/**
 * 从会话列表中提取预览文本
 */
function extractPreview(messages: CodexMessage[]): string {
  // 查找第一条用户消息
  const userMessage = messages.find((m) => m.role === 'user')
  if (userMessage) {
    const content = userMessage.content
    // 截取前 100 个字符
    return content.length > 100 ? content.substring(0, 100) + '...' : content
  }

  // 如果没有用户消息，显示第一条助手消息
  const assistantMessage = messages.find((m) => m.role === 'assistant')
  if (assistantMessage) {
    const content = assistantMessage.content
    return content.length > 100 ? content.substring(0, 100) + '...' : content
  }

  return '（空会话）'
}
```

### 3.2 JSONL 解析

```typescript
/**
 * 解析 JSONL 文件内容
 * @param content - JSONL 文件内容（字符串）
 * @returns 消息数组
 */
export function parseJsonlFile(content: string): CodexMessage[] {
  const messages: CodexMessage[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue // 跳过空行
    }

    try {
      const message = JSON.parse(trimmed) as CodexMessage
      // 验证必需字段
      if (message.role && message.content !== undefined) {
        messages.push(message)
      }
    } catch (error) {
      console.warn('JSON 解析失败:', trimmed.substring(0, 50))
      // 不中断，继续处理下一行
    }
  }

  return messages
}

/**
 * 将消息数组转换为 Markdown 格式
 * @param messages - 消息数组
 * @param sessionInfo - 会话基本信息
 * @returns Markdown 格式的字符串
 */
export function messagesToMarkdown(messages: CodexMessage[], sessionInfo: SessionMeta): string {
  const lines: string[] = []

  lines.push(`# Codex 会话`)
  lines.push(`- **会话 ID**: ${sessionInfo.sessionId}`)
  lines.push(`- **创建时间**: ${sessionInfo.dateTime}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const msg of messages) {
    const roleLabel =
      msg.role === 'user' ? '👤 用户' : msg.role === 'assistant' ? '🤖 助手' : '⚙️ 系统'
    const timestamp = msg.timestamp ? `(${msg.timestamp})` : ''

    lines.push(`## ${roleLabel} ${timestamp}`)
    lines.push('')
    lines.push(msg.content)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}
```

---

## 4. API 封装 (api/sessions.ts)

```typescript
import { fs, app, dialog } from 'vokex.app'
import { parseSessionFilename, parseJsonlFile, messagesToMarkdown } from '../utils/parser'
import type {
  SessionMeta,
  Session,
  SessionListItem,
  DeleteResult,
  FilterOptions,
} from '../types/session'

const SESSIONS_FOLDER = '.codex/sessions'

/**
 * 获取会话目录路径
 */
async function getSessionsPath(): Promise<string> {
  const home = await app.getPath('home')
  return `${home}/${SESSIONS_FOLDER}`
}

/**
 * 扫描所有会话文件
 */
export async function scanSessions(): Promise<SessionListItem[]> {
  const sessionsPath = await getSessionsPath()

  // 使用 glob 递归搜索所有 JSONL 文件
  const files = await fs.glob({
    pattern: '**/*.jsonl',
    cwd: sessionsPath,
    absolute: true,
  })

  // 解析每个文件名
  const sessions: SessionListItem[] = []

  for (const filePath of files) {
    const meta = parseSessionFilename(filePath)
    if (meta) {
      sessions.push({
        ...meta,
        messageCount: 0, // 列表中暂不加载
        preview: '', // 列表中暂不加载
      })
    }
  }

  // 按时间倒序排序（最新的在前）
  sessions.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())

  return sessions
}

/**
 * 加载完整会话内容
 */
export async function loadSession(filePath: string): Promise<Session | null> {
  try {
    const content = await fs.readFile(filePath)
    const messages = parseJsonlFile(content)
    const meta = parseSessionFilename(filePath)

    if (!meta) {
      return null
    }

    // 提取预览文本
    const preview = extractPreview(messages)

    return {
      ...meta,
      messages,
      messageCount: messages.length,
      preview,
    }
  } catch (error) {
    console.error('加载会话失败:', error)
    return null
  }
}

/**
 * 删除会话文件
 */
export async function deleteSession(session: SessionMeta): Promise<DeleteResult> {
  // 显示确认对话框
  const result = await dialog.showMessageBox({
    type: 'warning',
    title: '确认删除',
    message: `确定要删除这个会话吗？`,
    detail: `会话 ID: ${session.sessionId}\n创建时间: ${session.dateTime}\n\n此操作不可撤销！`,
    buttons: ['取消', '确定删除'],
    defaultId: 0, // 默认选中"取消"
    cancelId: 0, // ESC 键取消
  })

  // 用户取消
  if (result.response === 0) {
    return { success: false, cancelled: true }
  }

  // 执行删除
  try {
    await fs.deleteFile(session.fullPath)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除失败',
    }
  }
}

/**
 * 批量删除会话
 */
export async function deleteSessions(
  sessions: SessionMeta[],
): Promise<{ success: string[]; failed: { path: string; error: string }[] }> {
  const success: string[] = []
  const failed: { path: string; error: string }[] = []

  for (const session of sessions) {
    const result = await deleteSession(session)
    if (result.success) {
      success.push(session.sessionId)
    } else if (result.error) {
      failed.push({ path: session.fullPath, error: result.error })
    }
  }

  return { success, failed }
}

/**
 * 导出会话为 Markdown
 */
export async function exportSessionAsMarkdown(session: Session): Promise<string> {
  return messagesToMarkdown(session.messages, session)
}

/**
 * 筛选会话
 */
export function filterSessions(
  sessions: SessionListItem[],
  options: FilterOptions,
): SessionListItem[] {
  let filtered = [...sessions]

  // 关键词搜索
  if (options.keyword) {
    const keyword = options.keyword.toLowerCase()
    filtered = filtered.filter(
      (s) =>
        s.sessionId.toLowerCase().includes(keyword) ||
        s.date.includes(keyword) ||
        s.preview.toLowerCase().includes(keyword),
    )
  }

  // 日期范围筛选
  if (options.startDate) {
    filtered = filtered.filter((s) => s.date >= options.startDate!)
  }
  if (options.endDate) {
    filtered = filtered.filter((s) => s.date <= options.endDate!)
  }

  // 排序
  if (options.sortBy) {
    filtered.sort((a, b) => {
      let comparison = 0

      switch (options.sortBy) {
        case 'date':
        case 'time':
          comparison = new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
          break
        case 'size':
          comparison = a.sessionId.localeCompare(b.sessionId)
          break
      }

      return options.sortOrder === 'desc' ? -comparison : comparison
    })
  }

  return filtered
}
```

---

## 5. Vue 组件设计

### 5.1 SessionList.vue（会话列表）

```vue
<template>
  <div class="session-list">
    <header class="toolbar">
      <input
        v-model="searchKeyword"
        type="text"
        placeholder="搜索会话..."
        class="search-input"
        @input="handleSearch"
      />
      <button @click="refreshSessions" class="refresh-btn">🔄 刷新</button>
    </header>

    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
      <p>正在扫描会话...</p>
    </div>

    <div v-else-if="filteredSessions.length === 0" class="empty-state">
      <p>没有找到会话</p>
    </div>

    <div v-else class="sessions">
      <div
        v-for="session in filteredSessions"
        :key="session.sessionId"
        class="session-item"
        @click="selectSession(session)"
      >
        <div class="session-header">
          <span class="session-date">{{ session.date }}</span>
          <span class="session-time">{{ session.time }}</span>
        </div>
        <div class="session-preview">{{ session.preview || '（无内容）' }}</div>
        <div class="session-id">{{ session.sessionId.substring(0, 8) }}...</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { scanSessions, filterSessions } from '../api/sessions'
import type { SessionListItem, FilterOptions } from '../types/session'
import LoadingSpinner from './LoadingSpinner.vue'

const emit = defineEmits<{
  (e: 'select', session: SessionListItem): void
}>()

const sessions = ref<SessionListItem[]>([])
const filteredSessions = ref<SessionListItem[]>([])
const loading = ref(true)
const searchKeyword = ref('')

async function refreshSessions() {
  loading.value = true
  try {
    sessions.value = await scanSessions()
    applyFilter()
  } catch (error) {
    console.error('扫描会话失败:', error)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  applyFilter()
}

function applyFilter() {
  const options: FilterOptions = {
    keyword: searchKeyword.value || undefined,
  }
  filteredSessions.value = filterSessions(sessions.value, options)
}

function selectSession(session: SessionListItem) {
  emit('select', session)
}

onMounted(() => {
  refreshSessions()
})
</script>

<style scoped>
.session-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.refresh-btn {
  padding: 8px 16px;
  background: #3326fb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.sessions {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.session-item {
  padding: 16px;
  margin-bottom: 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.session-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.session-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #666;
  font-size: 13px;
}

.session-preview {
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  line-height: 1.5;
}

.session-id {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}
</style>
```

### 5.2 SessionDetail.vue（会话详情）

```vue
<template>
  <div class="session-detail">
    <header class="detail-header">
      <h2>会话详情</h2>
      <div class="actions">
        <button @click="handleExport" class="btn-export">📥 导出</button>
        <button @click="handleDelete" class="btn-delete">🗑️ 删除</button>
      </div>
    </header>

    <div v-if="!session" class="empty-state">
      <p>选择一个会话查看详情</p>
    </div>

    <div v-else class="content">
      <div class="session-info">
        <div class="info-row">
          <span class="label">会话 ID:</span>
          <span class="value">{{ session.sessionId }}</span>
        </div>
        <div class="info-row">
          <span class="label">创建时间:</span>
          <span class="value">{{ session.dateTime }}</span>
        </div>
        <div class="info-row">
          <span class="label">消息数:</span>
          <span class="value">{{ session.messageCount }}</span>
        </div>
      </div>

      <div class="messages">
        <div
          v-for="(message, index) in session.messages"
          :key="index"
          class="message"
          :class="message.role"
        >
          <div class="message-role">
            {{ message.role === 'user' ? '👤 用户' : '🤖 助手' }}
          </div>
          <div class="message-content">{{ message.content }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Session } from '../types/session'
import { deleteSession } from '../api/sessions'

const props = defineProps<{
  session: Session | null
}>()

const emit = defineEmits<{
  (e: 'deleted', sessionId: string): void
  (e: 'close'): void
}>()

async function handleDelete() {
  if (!props.session) return

  const result = await deleteSession(props.session)

  if (result.success) {
    emit('deleted', props.session.sessionId)
    emit('close')
  }
}

function handleExport() {
  if (!props.session) return

  // 生成 Markdown 内容
  const markdown = generateMarkdown(props.session)

  // 创建下载
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `session-${props.session.sessionId.substring(0, 8)}.md`
  a.click()
  URL.revokeObjectURL(url)
}

function generateMarkdown(session: Session): string {
  const lines: string[] = []
  lines.push(`# Codex 会话`)
  lines.push(`- **会话 ID**: ${session.sessionId}`)
  lines.push(`- **创建时间**: ${session.dateTime}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const msg of session.messages) {
    const roleLabel = msg.role === 'user' ? '👤 用户' : '🤖 助手'
    lines.push(`## ${roleLabel}`)
    lines.push('')
    lines.push(msg.content)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}
</script>

<style scoped>
.session-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #ddd;
}

.detail-header h2 {
  margin: 0;
  font-size: 18px;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-export,
.btn-delete {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-export {
  background: #f0f0f0;
  color: #333;
}

.btn-delete {
  background: #dc3545;
  color: white;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.session-info {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  margin-bottom: 8px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: bold;
  width: 100px;
  color: #666;
}

.value {
  flex: 1;
  font-family: monospace;
  word-break: break-all;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  padding: 16px;
  border-radius: 8px;
}

.message.user {
  background: #e3f2fd;
  margin-left: 20%;
}

.message.assistant {
  background: #f5f5f5;
  margin-right: 20%;
}

.message-role {
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #666;
}

.message-content {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
```

---

## 6. 根组件 (App.vue)

```vue
<template>
  <div class="app">
    <header class="app-header">
      <h1>Codex 会话管理器</h1>
    </header>

    <main class="app-main">
      <aside class="sidebar">
        <SessionList @select="handleSessionSelect" />
      </aside>

      <section class="content">
        <SessionDetail
          :session="selectedSession"
          @deleted="handleSessionDeleted"
          @close="handleCloseDetail"
        />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SessionList from './components/SessionList.vue'
import SessionDetail from './components/SessionDetail.vue'
import type { SessionListItem, Session } from './types/session'
import { loadSession } from './api/sessions'

const selectedSession = ref<Session | null>(null)

async function handleSessionSelect(sessionItem: SessionListItem) {
  // 加载完整会话内容
  const session = await loadSession(sessionItem.fullPath)
  selectedSession.value = session
}

function handleSessionDeleted(sessionId: string) {
  console.log('会话已删除:', sessionId)
  selectedSession.value = null
}

function handleCloseDetail() {
  selectedSession.value = null
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-header {
  padding: 16px 24px;
  background: #3326fb;
  color: white;
}

.app-header h1 {
  font-size: 20px;
  font-weight: 600;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 400px;
  border-right: 1px solid #ddd;
  overflow: hidden;
}

.content {
  flex: 1;
  overflow: hidden;
}
</style>
```

---

## 7. Vite 配置 (vite.config.ts)

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { vokexPlugin } from 'vokex.app/vite-plugin'

export default defineConfig({
  plugins: [
    vue(),
    vokexPlugin({
      name: 'Codex 会话管理器',
      identifier: 'com.codex.session-manager',
      version: '1.0.0',
      icon: 'public/icon.ico',
      window: {
        title: 'Codex 会话管理器',
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
      },
      devtools: process.env.NODE_ENV === 'development',
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
```

---

## 8. 主入口 (main.ts)

```typescript
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')
```

---

## 9. HTML 模板 (index.html)

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Codex 会话管理器</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

## 10. 依赖清单 (package.json)

```json
{
  "name": "codex-chat-manager",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "~5.6.0",
    "vite": "^6.0.0",
    "vue-tsc": "^2.0.0",
    "vokex.app": "^0.1.5"
  }
}
```

---

## 11. 核心流程图

### 11.1 扫描会话流程

```
应用启动
  ↓
扫描 .codex/sessions/**/*.jsonl
  ↓
解析文件名 → SessionMeta[]
  ↓
按时间排序
  ↓
显示列表
```

### 11.2 查看会话流程

```
用户点击会话
  ↓
加载文件内容 (fs.readFile)
  ↓
解析 JSONL → CodexMessage[]
  ↓
提取预览
  ↓
显示详情
```

### 11.3 删除会话流程

```
用户点击删除
  ↓
显示确认对话框
  ↓
用户确认？
  ├─ 否 → 取消操作
  └─ 是 → 执行删除 (fs.deleteFile)
      ↓
    删除成功？
      ├─ 是 → 刷新列表
      └─ 否 → 显示错误提示
```

---

## 12. 性能优化建议

### 12.1 列表优化

- **懒加载详情**: 列表只显示元信息，点击时才加载完整内容
- **虚拟滚动**: 如果会话超过 1000 个，使用虚拟滚动库
- **缓存**: 缓存已加载的会话内容

### 12.2 文件操作优化

- **异步扫描**: 使用 `fs.glob()` 一次性获取所有文件
- **分页加载**: 大型 JSONL 文件分页读取
- **限制预览**: 只显示前 100 条消息

### 12.3 UI 优化

- **骨架屏**: 加载时显示骨架屏而非 spinner
- **防抖**: 搜索输入防抖 300ms
- **键盘快捷键**: `Del` 删除、`Esc` 关闭详情

---

## 13. 后续扩展功能

### Phase 2 计划

- [ ] 批量选择和删除
- [ ] 日期范围筛选
- [ ] 按消息内容搜索
- [ ] 导出为 PDF

### Phase 3 计划

- [ ] 会话分组（按日期）
- [ ] 收藏/标记功能
- [ ] 深色模式
- [ ] 系统托盘

---

## 总结

这个代码设计方案：

✅ **轻量级** - 仅使用 Vue 3 + Vokex，无重型依赖
✅ **模块化** - 清晰的职责分离（API、组件、工具）
✅ **类型安全** - 完整的 TypeScript 类型定义
✅ **易维护** - 代码结构清晰，注释完整
✅ **可扩展** - 预留了 Phase 2/3 的扩展接口
