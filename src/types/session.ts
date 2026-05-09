export interface SessionMeta {
  sessionId: string;
  filename: string;
  fullPath: string;
  dateTime: string;
  date: string;
  time: string;
  year: string;
  month: string;
  day: string;
}

export interface CodexMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface Session extends SessionMeta {
  messages: CodexMessage[];
  messageCount: number;
  preview?: string;
}

export interface SessionListItem extends SessionMeta {
  messageCount: number;
  preview: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
}

export interface FilterOptions {
  keyword?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'date' | 'time' | 'size';
  sortOrder?: 'asc' | 'desc';
}
