import { execSync } from 'child_process';
import chalk from 'chalk';

export function uninstall() {
  console.log(chalk.blue('Uninstalling VibeLogger from Claude MCP...'));
  
  try {
    // Remove the MCP server registration from Claude
    execSync('claude mcp remove vibelog', { stdio: 'inherit' });
    console.log(chalk.green('✓ Successfully removed VibeLogger from Claude MCP'));
    console.log(chalk.gray('You may need to restart Claude for changes to take effect'));
  } catch (err) {
    console.error(chalk.red('Failed to remove MCP server from Claude'));
    console.error(chalk.gray('You can manually remove it with: claude mcp remove vibelog'));
    process.exit(1);
  }
}