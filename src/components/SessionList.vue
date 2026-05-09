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
      <button @click="refreshSessions" class="refresh-btn">刷新</button>
    </header>

    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
      <p>正在扫描会话...</p>
    </div>

    <div v-else-if="filteredSessions.length === 0" class="empty-state">
      <p>没有找到会话</p>
    </div>

    <div v-else class="sessions-container">
      <div
        v-for="session in filteredSessions"
        :key="session.sessionId"
        class="session-item"
        :class="{ selected: selectedSessionId === session.sessionId }"
        @click="selectSession(session)"
      >
        <div class="session-header">
          <span class="session-date">{{ session.date }}</span>
          <span class="session-time">{{ session.time }}</span>
        </div>
        <div class="session-preview">{{ session.preview }}</div>
        <div class="session-footer">
          <span class="message-count">{{ session.messageCount }} 条消息</span>
          <span class="session-id">{{ session.sessionId.substring(0, 8) }}...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { scanSessions, filterSessions } from "../api/sessions";
import type { SessionListItem, FilterOptions } from "../types/session";
import LoadingSpinner from "./LoadingSpinner.vue";

const emit = defineEmits<{
  (e: "select", session: SessionListItem): void;
}>();

const sessions = ref<SessionListItem[]>([]);
const filteredSessions = ref<SessionListItem[]>([]);
const loading = ref(true);
const searchKeyword = ref("");
const selectedSessionId = ref<string | null>(null);

async function refreshSessions() {
  loading.value = true;
  try {
    sessions.value = await scanSessions();
    applyFilter();
  } catch (error) {
    console.error("扫描会话失败:", error);
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  applyFilter();
}

function applyFilter() {
  const options: FilterOptions = {
    keyword: searchKeyword.value || undefined,
  };
  filteredSessions.value = filterSessions(sessions.value, options);
}

function selectSession(session: SessionListItem) {
  selectedSessionId.value = session.sessionId;
  emit("select", session);
}

function clearSelection() {
  selectedSessionId.value = null;
}

onMounted(() => {
  refreshSessions();
});

defineExpose({
  refresh: refreshSessions,
  clearSelection,
});
</script>

<style scoped>
.session-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #fff;
}

.toolbar {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #3326fb;
}

.refresh-btn {
  padding: 8px 16px;
  background: #3326fb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.refresh-btn:hover {
  background: #005a9e;
}

.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: #666;
}

.empty-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #999;
  font-size: 14px;
}

.sessions-container {
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
  transition: all 0.2s;
}

.session-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: #3326fb;
}

.session-item.selected {
  border-color: #3326fb;
  background: #e7f3ff;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
}

.session-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.session-date {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.session-time {
  font-size: 13px;
  color: #666;
}

.session-preview {
  font-size: 14px;
  color: #555;
  margin-bottom: 12px;
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.session-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.message-count {
  font-size: 12px;
  color: #3326fb;
  font-weight: 500;
}

.session-id {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}
</style>
