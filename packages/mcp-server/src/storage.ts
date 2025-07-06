import { promises as fs } from 'fs';
import path from 'path';
import fg from 'fast-glob';
import { LOG_RETENTION_DAYS, LogResource, getLogDirectory } from '@vibelogger/shared';

let logDir: string;
export const logIndex = new Map<string, LogResource>();

export async function getLogDir(): Promise<string> {
  if (logDir) return logDir;

  logDir = getLogDirectory();
  await fs.mkdir(logDir, { recursive: true });
  return logDir;
}

export async function initializeStorage(): Promise<void> {
  const dir = await getLogDir();
  
  // Load existing logs into index
  const files = await fg('*.ndjson', { cwd: dir, absolute: true });
  
  for (const file of files) {
    const name = path.basename(file, '.ndjson');
    const stats = await fs.stat(file);
    
    // Basic initialization - will be updated when logs are read
    logIndex.set(name, {
      id: name,
      uri: `log://${name}`,
      name: name,
      mimeType: 'text/plain',
      props: {
        started: stats.birthtime.toISOString(),
        last_ts: stats.mtime.toISOString(),
        line_count: 0,
        size_bytes: stats.size,
      },
    });
  }
}

export async function purgeOldLogs(): Promise<void> {
  const dir = await getLogDir();
  const cutoff = Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  
  const files = await fg('*.ndjson', { cwd: dir, absolute: true });
  
  for (const file of files) {
    try {
      const stats = await fs.stat(file);
      if (stats.mtimeMs < cutoff) {
        await fs.unlink(file);
        const name = path.basename(file, '.ndjson');
        logIndex.delete(name);
        console.log(`Purged old log file: ${file}`);
      }
    } catch (err) {
      console.error(`Error purging file ${file}:`, err);
    }
  }
}

export function startPurgeScheduler(): void {
  // Run purge on startup
  purgeOldLogs().catch(console.error);
  
  // Run purge every hour
  setInterval(() => {
    purgeOldLogs().catch(console.error);
  }, 60 * 60 * 1000);
}

export async function appendLog(name: string, data: string): Promise<void> {
  const dir = await getLogDir();
  const filePath = path.join(dir, `${name}.ndjson`);
  
  await fs.appendFile(filePath, data);
  
  // Update index
  const stats = await fs.stat(filePath);
  const existing = logIndex.get(name);
  
  if (existing) {
    existing.props.last_ts = new Date().toISOString();
    existing.props.size_bytes = stats.size;
    // Line count will be updated by the route handler
  } else {
    logIndex.set(name, {
      id: name,
      uri: `log://${name}`,
      name: name,
      mimeType: 'text/plain',
      props: {
        started: new Date().toISOString(),
        last_ts: new Date().toISOString(),
        line_count: 1,
        size_bytes: stats.size,
      },
    });
  }
}