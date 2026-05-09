import type { SessionMeta, CodexMessage } from '../types/session';

const SESSION_REGEX = /^rollout-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-([a-f0-9-]+)\.jsonl$/i;

interface JsonlLine {
  type?: string;
  payload?: {
    type?: string;
    role?: string;
    message?: string;
    content?: Array<{ text?: string; type?: string }>;
    [key: string]: any;
  };
  [key: string]: any;
}

export function parseSessionFilename(filePath: string): SessionMeta | null {
  const filename = filePath.split(/[/\\]/).pop() || '';
  const match = filename.match(SESSION_REGEX);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second, sessionId] = match;

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
  };
}

export function parseJsonlFile(content: string): CodexMessage[] {
  const messages: CodexMessage[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    try {
      const data = JSON.parse(trimmed) as JsonlLine;
      const message = extractMessage(data);
      if (message) {
        messages.push(message);
      }
    } catch {
      console.warn('JSON 解析失败:', trimmed.substring(0, 50));
    }
  }

  return messages;
}

function extractMessage(data: JsonlLine): CodexMessage | null {
  const { type, payload } = data;

  if (!payload) {
    return null;
  }

  if (type === 'event_msg') {
    if (payload.type === 'user_message') {
      const content = payload.message || '';
      if (isValidUserMessage(content)) {
        return {
          role: 'user',
          content,
        };
      }
    }
    if (payload.type === 'agent_message') {
      const content = payload.message || '';
      if (content.trim()) {
        return {
          role: 'assistant',
          content,
        };
      }
    }
  }

  if (type === 'response_item') {
    if (payload.role === 'user' && payload.content) {
      const text = extractTextFromContent(payload.content);
      if (isValidUserMessage(text)) {
        return {
          role: 'user',
          content: text,
        };
      }
    }
    if (payload.role === 'assistant' && payload.content) {
      const text = extractTextFromContent(payload.content);
      if (text.trim()) {
        return {
          role: 'assistant',
          content: text,
        };
      }
    }
  }

  return null;
}

function extractTextFromContent(content: Array<{ text?: string; type?: string }>): string {
  const texts: string[] = [];
  for (const item of content) {
    if (item.text) {
      texts.push(item.text);
    }
  }
  return texts.join('\n');
}

function isValidUserMessage(content: string): boolean {
  if (!content || !content.trim()) {
    return false;
  }

  const trimmed = content.trim();

  if (trimmed.startsWith('<environment_context>')) {
    return false;
  }

  if (trimmed.startsWith('<permissions instructions>')) {
    return false;
  }

  if (trimmed.startsWith('<agent_info>')) {
    return false;
  }

  if (trimmed.startsWith('{"timestamp":')) {
    return false;
  }

  if (trimmed.length < 3) {
    return false;
  }

  return true;
}

export function extractPreview(messages: CodexMessage[]): string {
  const userMessages = messages.filter((m) => m.role === 'user');
  
  for (const msg of userMessages) {
    const content = msg.content.trim();
    if (content && content.length > 0) {
      return content.length > 100 ? content.substring(0, 100) + '...' : content;
    }
  }

  const assistantMessages = messages.filter((m) => m.role === 'assistant');
  for (const msg of assistantMessages) {
    const content = msg.content.trim();
    if (content && content.length > 0) {
      return content.length > 100 ? content.substring(0, 100) + '...' : content;
    }
  }

  return '（空会话）';
}

export function messagesToMarkdown(
  messages: CodexMessage[],
  sessionInfo: SessionMeta
): string {
  const lines: string[] = [];

  lines.push(`# Codex 会话`);
  lines.push(`- **会话 ID**: ${sessionInfo.sessionId}`);
  lines.push(`- **创建时间**: ${sessionInfo.dateTime}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const msg of messages) {
    const roleLabel =
      msg.role === 'user' ? '👤 用户' : msg.role === 'assistant' ? '🤖 助手' : '⚙️ 系统';

    lines.push(`## ${roleLabel}`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}
