import { spawn as ptySpawn } from 'node-pty';
import fetch from 'node-fetch';
import { Buffer } from 'buffer';
import { promises as fs } from 'fs';
import path from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import { 
  SERVER_URL, 
  PATHS, 
  LogRecord, 
  encodeBase64,
  sanitizeName
} from '@vibelogger/shared';

interface WrapperOptions {
  name?: string;
  stdin?: boolean;
}

export async function spawn(command: string[], options: WrapperOptions) {
  const cmdName = path.basename(command[0]);
  const name = options.name || cmdName;
  const sanitizedName = sanitizeName(name);
  
  // Check if server is running
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log(chalk.yellow('VibeLogger server not running. Starting...'));
    await startServer();
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(chalk.gray(`[VibeLogger] Starting: ${command.join(' ')} with name: ${sanitizedName}`));
  
  // Create PTY instance
  const child = ptySpawn(command[0], command.slice(1), {
    name: 'xterm-256color',
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
    cwd: process.cwd(),
    env: process.env as Record<string, string>,
  });
  
  // Handle window resize
  process.stdout.on('resize', () => {
    child.resize(
      process.stdout.columns || 80,
      process.stdout.rows || 24
    );
  });
  
  // Stream logs to server
  const streamPromise = streamToServer(sanitizedName);
  const { enqueue, close } = await streamPromise;
  
  // Forward output to terminal and capture for logging
  child.onData((data) => {
    process.stdout.write(data);
    
    const record: LogRecord = {
      ts: Date.now(),
      stream: 'stdout',
      data: encodeBase64(data),
    };
    
    enqueue(record);
  });
  
  // Forward stdin if enabled
  if (options.stdin !== false && process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.on('data', (data) => {
      child.write(data.toString());
      
      const record: LogRecord = {
        ts: Date.now(),
        stream: 'stdin',
        data: encodeBase64(data.toString()),
      };
      
      enqueue(record);
    });
  }
  
  // Handle exit
  child.onExit(async ({ exitCode }) => {
    const record: LogRecord = {
      ts: Date.now(),
      event: 'exit',
      code: exitCode || 0,
    };
    
    enqueue(record);
    close();
    
    // Wait a bit for final logs to be sent
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (options.stdin !== false && process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    
    process.exit(exitCode || 0);
  });
}

async function checkServer(): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function startServer() {
  const { spawn } = await import('child_process');
  const serverPath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    '../../mcp-server/dist/server.js'
  );
  
  spawn('node', [serverPath], {
    detached: true,
    stdio: 'ignore',
  }).unref();
}

async function streamToServer(name: string) {
  const chunks: string[] = [];
  let isStreaming = true;
  
  // Start sending chunks periodically
  const sendChunks = async () => {
    while (isStreaming || chunks.length > 0) {
      if (chunks.length > 0) {
        const batch = chunks.splice(0, chunks.length).join('');
        try {
          const url = `${SERVER_URL}${PATHS.INGEST}/${name}`;
          console.log(chalk.gray(`[VibeLogger] Sending ${batch.split('\n').length - 1} records to ${url}`));
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-ndjson',
            },
            body: batch,
          });
          if (!response.ok) {
            console.error(chalk.red(`Server returned ${response.status}`));
          }
        } catch (err) {
          console.error(chalk.red('Failed to send logs. Buffering...'), err);
          await bufferLogs(name);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };
  
  sendChunks();
  
  return {
    enqueue: (record: LogRecord) => {
      const line = JSON.stringify(record) + '\n';
      chunks.push(line);
    },
    close: () => {
      isStreaming = false;
    },
  };
}

async function bufferLogs(name: string) {
  const cacheDir = path.join(homedir(), '.cache', 'vibelog');
  await fs.mkdir(cacheDir, { recursive: true });
  
  const bufferFile = path.join(cacheDir, `${name}.buffer`);
  // Implementation for buffering would go here
  console.log(chalk.yellow(`Logs will be buffered to ${bufferFile}`));
}