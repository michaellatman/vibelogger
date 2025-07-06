export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function encodeBase64(str: string): string {
  // Check if we're in a browser environment
  if (typeof globalThis !== 'undefined' && 'btoa' in globalThis) {
    // Browser environment - use btoa
    return globalThis.btoa(unescape(encodeURIComponent(str)));
  } else if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return Buffer.from(str).toString('base64');
  } else {
    throw new Error('No base64 encoding method available');
  }
}

export function decodeBase64(str: string): string {
  // Check if we're in a browser environment
  if (typeof globalThis !== 'undefined' && 'atob' in globalThis) {
    // Browser environment - use atob
    return decodeURIComponent(escape(globalThis.atob(str)));
  } else if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return Buffer.from(str, 'base64').toString('utf-8');
  } else {
    throw new Error('No base64 decoding method available');
  }
}

export function parseNDJSON<T>(line: string): T | null {
  try {
    return JSON.parse(line) as T;
  } catch {
    return null;
  }
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString();
}

export function getLogPath(baseDir: string, name: string): string {
  return `${baseDir}/${name}.ndjson`;
}

export function getDaysSince(ts: number): number {
  return (Date.now() - ts) / (1000 * 60 * 60 * 24);
}

export function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
}

export function getLogDirectory(): string {
  const homedir = typeof process !== 'undefined' && process.env.HOME 
    ? process.env.HOME 
    : '/tmp';
  
  const xdgStateHome = typeof process !== 'undefined' && process.env.XDG_STATE_HOME;
  
  if (xdgStateHome) {
    return `${xdgStateHome}/vibelog/logs`;
  } else {
    return `${homedir}/.local/state/vibelog/logs`;
  }
}