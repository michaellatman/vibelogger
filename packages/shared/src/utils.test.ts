import { describe, it, expect, vi } from 'vitest';
import {
  encodeBase64,
  decodeBase64,
  stripAnsi,
  parseNDJSON,
  sanitizeName,
  getLogPath,
  getDaysSince,
  getLogDirectory,
  getServerLockPath,
  formatTimestamp,
} from './utils.js';

describe('utils', () => {
  it('encodes and decodes base64', () => {
    const str = 'hello world';
    const encoded = encodeBase64(str);
    expect(encoded).toBe(Buffer.from(str).toString('base64'));
    expect(decodeBase64(encoded)).toBe(str);
  });

  it('strips ANSI codes', () => {
    const colored = '\u001b[31mred\u001b[0m';
    expect(stripAnsi(colored)).toBe('red');
  });

  it('parses NDJSON and returns null on invalid JSON', () => {
    const obj = { a: 1 };
    const line = JSON.stringify(obj);
    expect(parseNDJSON<typeof obj>(line)).toEqual(obj);
    expect(parseNDJSON('invalid')).toBeNull();
  });

  it('sanitizes names to lowercase alphanumeric with underscores', () => {
    expect(sanitizeName('Hello World!')).toBe('hello_world_');
  });

  it('builds log path correctly', () => {
    expect(getLogPath('/tmp/logs', 'session')).toBe('/tmp/logs/session.ndjson');
  });

  it('calculates days since timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
    const ts = Date.parse('2024-01-01T00:00:00Z');
    expect(getDaysSince(ts)).toBeCloseTo(1, 5);
    vi.useRealTimers();
  });

  it('resolves log directory based on env vars', () => {
    const origHome = process.env.HOME;
    const origXdg = process.env.XDG_STATE_HOME;
    process.env.HOME = '/home/test';
    delete process.env.XDG_STATE_HOME;
    expect(getLogDirectory()).toBe('/home/test/.local/state/vibelog/logs');
    process.env.XDG_STATE_HOME = '/state';
    expect(getLogDirectory()).toBe('/state/vibelog/logs');
    process.env.HOME = origHome;
    if (origXdg !== undefined) {
      process.env.XDG_STATE_HOME = origXdg;
    } else {
      delete process.env.XDG_STATE_HOME;
    }
  });

  it('computes server lock path', () => {
    const dir = getLogDirectory();
    expect(getServerLockPath()).toBe(`${dir}/server.lock`);
  });

  it('formats timestamp to ISO string', () => {
    const ts = Date.parse('2024-01-01T12:34:56Z');
    expect(formatTimestamp(ts)).toBe('2024-01-01T12:34:56.000Z');
  });
});
