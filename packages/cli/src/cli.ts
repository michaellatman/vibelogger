#!/usr/bin/env node
import { Command } from 'commander';
import { spawn } from './wrapper.js';
import { init } from './init.js';
import { serve } from './serve.js';
import { open } from './open.js';
import { uninstall } from './uninstall.js';

const program = new Command();

program
  .name('vibelog')
  .description('CLI wrapper for logging commands to VibeLogger')
  .version('1.0.0');

// Default command - wrap a command
program
  .arguments('<command...>')
  .option('-n, --name <name>', 'log file name', '')
  .option('--no-stdin', 'disable stdin capture')
  .action((command, options) => {
    spawn(command, options);
  });

// Init command (alias for install-mcp)
program
  .command('init')
  .alias('install-mcp')
  .description('Initialize VibeLogger and register with Claude MCP')
  .action(() => {
    init();
  });

// Serve command
program
  .command('serve')
  .description('Start the VibeLogger server')
  .action(() => {
    serve();
  });

// Open command
program
  .command('open')
  .description('Open the logs directory in Finder')
  .action(() => {
    open();
  });

// Uninstall command
program
  .command('uninstall-mcp')
  .description('Remove VibeLogger from Claude MCP')
  .action(() => {
    uninstall();
  });

program.parse();