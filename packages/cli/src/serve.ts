import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

export function serve() {
  console.log(chalk.blue('Starting VibeLogger server...'));
  
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const serverPath = path.resolve(__dirname, '../../mcp-server/dist/server.js');
  
  const child = spawn('node', [serverPath], {
    stdio: 'inherit',
  });
  
  child.on('error', (err) => {
    console.error(chalk.red('Failed to start server:'), err);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(chalk.red(`Server exited with code ${code}`));
      process.exit(code || 1);
    }
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });
}