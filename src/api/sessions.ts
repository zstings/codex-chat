import { fs, app, dialog } from 'vokex.app';
import {
  parseSessionFilename,
  parseJsonlFile,
  extractPreview,
  messagesToMarkdown,
} from '../utils/parser';
import type {
  SessionMeta,
  Session,
  SessionListItem,
  DeleteResult,
  FilterOptions,
} from '../types/session';

const SESSIONS_FOLDER = '.codex/sessions';

async function getSessionsPath(): Promise<string> {
  const home = await app.getPath('home');
  return `${home}/${SESSIONS_FOLDER}`;
}

export async function scanSessions(): Promise<SessionListItem[]> {
  const sessionsPath = await getSessionsPath();

  const files = await fs.glob({
    pattern: '**/*.jsonl',
    cwd: sessionsPath,
    absolute: true,
  });

  const sessions: SessionListItem[] = [];

  for (const filePath of files) {
    const meta = parseSessionFilename(filePath);
    if (meta) {
      sessions.push({
        ...meta,
        messageCount: 0,
        preview: '',
      });
    }
  }

  sessions.sort(
    (a, b) =>
      new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
  );

  return sessions;
}

export async function loadSession(filePath: string): Promise<Session | null> {
  try {
    const content = await fs.readFile(filePath);
    const messages = parseJsonlFile(content);
    const meta = parseSessionFilename(filePath);

    if (!meta) {
      return null;
    }

    const preview = extractPreview(messages);

    return {
      ...meta,
      messages,
      messageCount: messages.length,
      preview,
    };
  } catch (error) {
    console.error('加载会话失败:', error);
    return null;
  }
}

export async function deleteSession(session: SessionMeta): Promise<DeleteResult> {
  const result = await dialog.showMessageBox({
    type: 'warning',
    title: '确认删除',
    message: `确定要删除这个会话吗？`,
    detail: `会话 ID: ${session.sessionId}\n创建时间: ${session.dateTime}\n\n此操作不可撤销！`,
    buttons: ['取消', '确定删除'],
    defaultId: 0,
    cancelId: 0,
  });

  if (result.response === 0) {
    return { success: false, cancelled: true };
  }

  try {
    await fs.deleteFile(session.fullPath);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除失败',
    };
  }
}

export async function deleteSessions(
  sessions: SessionMeta[]
): Promise<{ success: string[]; failed: { path: string; error: string }[] }> {
  const success: string[] = [];
  const failed: { path: string; error: string }[] = [];

  for (const session of sessions) {
    const result = await deleteSession(session);
    if (result.success) {
      success.push(session.sessionId);
    } else if (result.error) {
      failed.push({ path: session.fullPath, error: result.error });
    }
  }

  return { success, failed };
}

export function exportSessionAsMarkdown(session: Session): string {
  return messagesToMarkdown(session.messages, session);
}

export function filterSessions(
  sessions: SessionListItem[],
  options: FilterOptions
): SessionListItem[] {
  let filtered = [...sessions];

  if (options.keyword) {
    const keyword = options.keyword.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.sessionId.toLowerCase().includes(keyword) ||
        s.date.includes(keyword) ||
        s.preview.toLowerCase().includes(keyword)
    );
  }

  if (options.startDate) {
    filtered = filtered.filter((s) => s.date >= options.startDate!);
  }
  if (options.endDate) {
    filtered = filtered.filter((s) => s.date <= options.endDate!);
  }

  if (options.sortBy) {
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (options.sortBy) {
        case 'date':
        case 'time':
          comparison =
            new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
          break;
        case 'size':
          comparison = a.sessionId.localeCompare(b.sessionId);
          break;
      }

      return options.sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  return filtered;
}
