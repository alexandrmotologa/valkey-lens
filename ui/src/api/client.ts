export interface KeySummary {
  name: string;
  type: string;
  ttl_ms: number;
  memory_bytes: number;
  namespace: string;
}

export interface ScanResponse {
  cursor: number;
  keys: KeySummary[];
  total_keys: number;
}

export interface KeyDetail {
  name: string;
  type: string;
  ttl_ms: number;
  memory_bytes: number;
  length: number;
  value: any;
  is_json: boolean;
}

export interface NamespaceNode {
  name: string;
  full_path: string;
  key_count: number;
  total_bytes: number;
  percentage: number;
  volatile_count: number;
  persistent_count: number;
  children?: NamespaceNode[];
}

export interface BigKeyEntry {
  key: string;
  type: string;
  bytes: number;
  ttl: number;
  namespace: string;
}

export interface ProfileReport {
  timestamp: string;
  scanned_keys: number;
  total_bytes: number;
  root: NamespaceNode;
  namespaces: NamespaceNode[];
  big_keys: BigKeyEntry[];
  leak_alerts?: string[];
}

export interface StreamMessage {
  id: string;
  fields: Record<string, string>;
  timestamp: number;
}

export interface ConsumerGroup {
  name: string;
  consumers: number;
  pending: number;
  last_delivered_id: string;
  lag: number;
}

export interface PendingEntry {
  id: string;
  consumer: string;
  idle_time_ms: number;
  delivery_count: number;
}

export interface StreamDetail {
  key: string;
  length: number;
  first_entry_id: string;
  last_entry_id: string;
  groups: ConsumerGroup[];
  entries: StreamMessage[];
}

export interface MetricPoint {
  timestamp: number;
  ops_per_sec: number;
  used_memory_bytes: number;
  used_memory_rss: number;
  connected_clients: number;
  hit_ratio: number;
  cpu_usage: number;
  io_threads_active: number;
}

export interface ServerInfo {
  version: string;
  mode: string;
  os: string;
  uptime_sec: number;
  total_keys: number;
  used_memory_human: string;
  used_memory_rss_human: string;
  mem_frag_ratio: number;
  is_valkey: boolean;
}

export interface TelemetrySnapshot {
  server: ServerInfo;
  current: MetricPoint;
  history: MetricPoint[];
}

export interface SlowlogRecord {
  id: number;
  timestamp: string;
  duration: number; // nanoseconds
  command: string[];
  client_ip?: string;
  client_name?: string;
}

export interface REPLResult {
  command: string;
  type: string;
  raw: any;
  formatted: string;
  duration_ms: number;
  is_error: boolean;
  error_message?: string;
}

export interface CommandDef {
  name: string;
  syntax: string;
  summary: string;
  group: string;
}

export interface SystemInfo {
  version: string;
  read_only: boolean;
  is_demo: boolean;
  cluster: boolean;
  url: string;
}

export interface ConnectionProfile {
  id: string;
  name: string;
  url: string;
  read_only: boolean;
  color: string;
}

const API_BASE = '/api';

async function req<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errObj = await res.json();
      if (errObj.message) errorMsg = errObj.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // System
  getSystemInfo: () => req<SystemInfo>('/system/info'),
  getProfiles: () => req<ConnectionProfile[]>('/system/profiles'),
  saveProfiles: (profiles: ConnectionProfile[]) =>
    req<{ success: boolean }>('/system/profiles', {
      method: 'POST',
      body: JSON.stringify(profiles),
    }),

  // Keys
  getKeys: (cursor = 0, pattern = '*', count = 250) =>
    req<ScanResponse>(`/keys?cursor=${cursor}&pattern=${encodeURIComponent(pattern)}&count=${count}`),
  getKeyDetail: (key: string) => req<KeyDetail>(`/keys/detail?key=${encodeURIComponent(key)}`),
  setString: (key: string, value: string, ttl_sec: number) =>
    req<{ success: boolean }>('/keys/set', {
      method: 'POST',
      body: JSON.stringify({ key, value, ttl_sec }),
    }),
  updateTTL: (key: string, ttl_sec: number) =>
    req<{ success: boolean }>('/keys/ttl', {
      method: 'POST',
      body: JSON.stringify({ key, ttl_sec }),
    }),
  deleteKey: (key: string) =>
    req<{ success: boolean }>(`/keys?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
    }),
  deletePattern: (pattern: string) =>
    req<{ success: boolean; deleted: number }>('/keys/delete-pattern', {
      method: 'POST',
      body: JSON.stringify({ pattern }),
    }),
  hset: (key: string, field: string, value: string) =>
    req<{ success: boolean }>('/keys/hash/set', {
      method: 'POST',
      body: JSON.stringify({ key, field, value }),
    }),
  hdel: (key: string, field: string) =>
    req<{ success: boolean }>(`/keys/hash/field?key=${encodeURIComponent(key)}&field=${encodeURIComponent(field)}`, {
      method: 'DELETE',
    }),

  // Memory Profiler
  getMemoryProfile: (limit = 5000, pattern = '*', delimiter = ':', top = 50) =>
    req<ProfileReport>(
      `/memory/profile?limit=${limit}&pattern=${encodeURIComponent(pattern)}&delimiter=${encodeURIComponent(delimiter)}&top=${top}`
    ),
  getExportJSONUrl: () => `${API_BASE}/memory/export/json`,
  getExportHTMLUrl: () => `${API_BASE}/memory/export/html`,

  // Streams
  getStreamDetail: (key: string, limit = 50) =>
    req<StreamDetail>(`/streams/detail?key=${encodeURIComponent(key)}&limit=${limit}`),
  getStreamPending: (key: string, group: string, limit = 50) =>
    req<PendingEntry[]>(`/streams/pending?key=${encodeURIComponent(key)}&group=${encodeURIComponent(group)}&limit=${limit}`),

  // Telemetry
  getTelemetrySnapshot: () => req<TelemetrySnapshot>('/telemetry/snapshot'),
  getSlowlogs: (limit = 50) => req<SlowlogRecord[]>(`/telemetry/slowlog?limit=${limit}`),

  // REPL
  execREPL: (command: string) =>
    req<REPLResult>('/repl/exec', {
      method: 'POST',
      body: JSON.stringify({ command }),
    }),
  getCompletions: (q: string) =>
    req<CommandDef[]>(`/repl/autocomplete?q=${encodeURIComponent(q)}`),
};

// SSE Telemetry Subscription
export function subscribeTelemetry(
  onSnapshot: (snap: TelemetrySnapshot) => void,
  onMetric: (point: MetricPoint) => void,
  onSlowlog: (records: SlowlogRecord[]) => void
): () => void {
  const evtSource = new EventSource(`${API_BASE}/telemetry/stream`);

  evtSource.addEventListener('snapshot', (e) => {
    try {
      const snap: TelemetrySnapshot = JSON.parse(e.data);
      onSnapshot(snap);
    } catch {}
  });

  evtSource.addEventListener('metric', (e) => {
    try {
      const point: MetricPoint = JSON.parse(e.data);
      onMetric(point);
    } catch {}
  });

  evtSource.addEventListener('slowlog', (e) => {
    try {
      const records: SlowlogRecord[] = JSON.parse(e.data);
      onSlowlog(records);
    } catch {}
  });

  return () => {
    evtSource.close();
  };
}

export function formatBytes(b: number): string {
  if (b === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
