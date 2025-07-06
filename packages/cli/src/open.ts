import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { getLogDirectory } from '@vibelogger/shared';

export function open() {
  const logsDir = getLogDirectory();
  
  // Ensure the directory exists
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
    console.log('Created logs directory:', logsDir);
  }
  
  // Open in Finder (macOS)
  try {
    execSync(`open "${logsDir}"`);
    console.log('Opening logs directory:', logsDir);
  } catch (err) {
    console.error('Failed to open logs directory:', err);
  }
}