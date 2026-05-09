<template>
  <div class="app">
    <header class="app-header">
      <img src="/icon/logo.png" alt="" />
      <h1>Codex 会话管理器</h1>
    </header>

    <main class="app-main">
      <aside class="sidebar">
        <div class="sidebar-content">
          <SessionList @select="handleSessionSelect" />
        </div>
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
import { ref } from "vue";
import SessionList from "./components/SessionList.vue";
import SessionDetail from "./components/SessionDetail.vue";
import type { SessionListItem, Session } from "./types/session";
import { loadSession } from "./api/sessions";

const selectedSession = ref<Session | null>(null);

async function handleSessionSelect(sessionItem: SessionListItem) {
  const session = await loadSession(sessionItem.fullPath);
  console.log("加载会话:", session);
  selectedSession.value = session;
}

function handleSessionDeleted(sessionId: string) {
  console.log("会话已删除:", sessionId);
  selectedSession.value = null;
}

function handleCloseDetail() {
  selectedSession.value = null;
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.app-header {
  padding: 16px 24px;
  background: #1f1f1f;
  color: white;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.app-header img {
  width: 40px;
  margin-right: 12px;
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
  min-width: 300px;
  max-width: 600px;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

.sidebar-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.content {
  flex: 1;
  overflow: hidden;
  background: #fff;
}
</style>
