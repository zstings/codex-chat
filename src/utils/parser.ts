import type { SessionMeta, CodexMessage } from '../types/session';

const SESSION_REGEX = /^rollout-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-([a-f0-9-]+)\.jsonl$/i;

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
      const message = JSON.parse(trimmed) as CodexMessage;
      if (message.role && message.content !== undefined) {
        messages.push(message);
      }
    } catch {
      console.warn('JSON 解析失败:', trimmed.substring(0, 50));
    }
  }

  return messages;
}

export function extractPreview(messages: CodexMessage[]): string {
  const userMessage = messages.find((m) => m.role === 'user');
  if (userMessage) {
    const content = userMessage.content;
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  }

  const assistantMessage = messages.find((m) => m.role === 'assistant');
  if (assistantMessage) {
    const content = assistantMessage.content;
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
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
    const timestamp = msg.timestamp ? `(${msg.timestamp})` : '';

    lines.push(`## ${roleLabel} ${timestamp}`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}
