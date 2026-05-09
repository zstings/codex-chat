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
import type { Session } from '../types/session';
import { deleteSession } from '../api/sessions';
import { messagesToMarkdown } from '../utils/parser';

const props = defineProps<{
  session: Session | null;
}>();

const emit = defineEmits<{
  (e: 'deleted', sessionId: string): void;
  (e: 'close'): void;
}>();

async function handleDelete() {
  if (!props.session) return;

  const result = await deleteSession(props.session);

  if (result.success) {
    emit('deleted', props.session.sessionId);
    emit('close');
  }
}

function handleExport() {
  if (!props.session) return;

  const markdown = messagesToMarkdown(props.session.messages, props.session);

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `session-${props.session.sessionId.substring(0, 8)}.md`;
  a.click();
  URL.revokeObjectURL(url);
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
