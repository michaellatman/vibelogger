import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vibelogger-test-'));
  vi.resetModules();
  vi.mock('@vibelogger/shared', async () => {
    const actual = await vi.importActual<typeof import('@vibelogger/shared')>('@vibelogger/shared');
    return {
      ...actual,
      getLogDirectory: () => tmpDir,
    };
  });
});

afterEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function fileExists(p: string): Promise<boolean> {
  return fs.access(p).then(() => true).catch(() => false);
}

describe('storage', () => {
  it('returns mocked log directory', async () => {
    const { getLogDir } = await import('./storage.js');
    const dir = await getLogDir();
    expect(dir).toBe(tmpDir);
    expect((await fs.stat(dir)).isDirectory()).toBe(true);
  });

  it('appends log and updates index', async () => {
    const { appendLog, logIndex } = await import('./storage.js');
    await appendLog('test', 'hello\n');
    const file = path.join(tmpDir, 'test.ndjson');
    expect(await fs.readFile(file, 'utf8')).toBe('hello\n');
    const entry = logIndex.get('test');
    expect(entry).toBeDefined();
    expect(entry?.props.size_bytes).toBeGreaterThan(0);
  });

  it('purges old logs', async () => {
    const { appendLog, purgeOldLogs, logIndex } = await import('./storage.js');
    await appendLog('old', 'data\n');
    const file = path.join(tmpDir, 'old.ndjson');
    const oldDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    await fs.utimes(file, oldDate, oldDate);
    await purgeOldLogs();
    expect(await fileExists(file)).toBe(false);
    expect(logIndex.has('old')).toBe(false);
  });
});
