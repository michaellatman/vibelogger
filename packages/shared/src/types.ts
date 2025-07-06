export interface LogRecord {
  ts: number;
  stream?: 'stdout' | 'stderr' | 'stdin';
  data?: string;
  event?: 'exit' | 'error';
  code?: number;
  level?: 'log' | 'info' | 'warn' | 'error' | 'debug';
  url?: string;
  message?: string;
}

export interface LogResource {
  id: string;
  uri: string;
  name: string;
  mimeType: string;
  props: {
    started: string;
    last_ts: string;
    line_count: number;
    size_bytes: number;
    secs_since_activity?: number;
  };
}

export interface GetLogOptions {
  id: string;
  fmt?: 'text' | 'json';
  tail?: number;
  head?: number;
  since?: string;
}

export interface AllowedSite {
  domain: string;
  enabled: boolean;
  name?: string;
}

export type LogLevel = 'none' | 'minimal' | 'verbose';

export interface ExtensionSettings {
  logLevel?: LogLevel;
}

export interface ChromeMessage {
  type: 'console' | 'network' | 'error';
  timestamp: number;
  level?: string;
  args?: any[];
  url?: string;
  method?: string;
  status?: number;
  error?: string;
}

export interface IngestRequest {
  name: string;
  records: LogRecord[];
}

export interface ResourcesListResponse {
  resources: LogResource[];
}

export interface GetLogResponse {
  content: string;
}

export interface MCPManifest {
  name: string;
  version: string;
  description: string;
  tools: {
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  }[];
}