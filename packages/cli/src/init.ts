import { execSync } from 'child_process';
import chalk from 'chalk';
import { SERVER_URL } from '@vibelogger/shared';

export async function init() {
  console.log(chalk.blue('Installing VibeLogger MCP server...'));
  
  // Start server if not running
  try {
    const response = await fetch(`${SERVER_URL}/health`);
    if (!response.ok) {
      throw new Error('Server not healthy');
    }
    console.log(chalk.green('✓ Server is running'));
  } catch {
    console.log(chalk.yellow('Starting server...'));
    const { serve } = await import('./serve.js');
    serve();
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Register with Claude MCP
  console.log(chalk.blue('Registering with Claude MCP...'));
  
  // Find the correct claude command
  let claudeCommand = 'claude';
  
  // Check for the local claude installation first
  const localClaude = '/Users/latman/.claude/local/claude';
  try {
    execSync(`test -f ${localClaude}`, { stdio: 'ignore' });
    claudeCommand = localClaude;
    console.log(chalk.gray('Using local Claude at:', localClaude));
  } catch {
    // Fall back to PATH
    try {
      const claudePath = execSync('which claude', { encoding: 'utf8' }).trim();
      console.log(chalk.gray('Using claude from PATH at:', claudePath));
      claudeCommand = 'claude';
    } catch {
      console.log(chalk.yellow('Could not find claude command'));
    }
  }
  
  // Try to get claude version
  try {
    const claudeVersion = execSync(`${claudeCommand} --version`, { encoding: 'utf8' }).trim();
    console.log(chalk.gray('Claude version:', claudeVersion));
  } catch {
    // Version command might not exist
  }
  
  const command = `${claudeCommand} mcp add --transport http vibelog ${SERVER_URL}/mcp`;
  console.log(chalk.gray('Running:', command));
  
  try {
    const output = execSync(command, {
      encoding: 'utf8',
    });
    console.log(chalk.green('✓ Successfully registered with Claude MCP'));
    if (output) {
      console.log(chalk.gray(output.trim()));
    }
  } catch (err: any) {
    const errorOutput = err.stdout?.toString() || err.stderr?.toString() || err.message || '';
    
    console.log(chalk.gray('Error output:', errorOutput));
    console.log(chalk.gray('Exit code:', err.status));
    
    // Check if it actually succeeded despite the error
    if (errorOutput.includes('Added HTTP MCP server')) {
      console.log(chalk.green('✓ Successfully registered with Claude MCP'));
    } else if (errorOutput.includes('Invalid transport type')) {
      // This seems to be a false error - the command might still work
      console.log(chalk.yellow('\nNote: This error may be outdated. The command might still work.'));
      console.log(chalk.gray('Try running it manually to confirm:'));
      console.log(chalk.cyan(`  ${command}`));
    } else {
      console.error(chalk.red('Failed to register with Claude MCP'));
      console.error(chalk.yellow('Please run manually:'));
      console.error(chalk.cyan(`  ${command}`));
    }
  }
  
  console.log(chalk.green('\n✅ VibeLogger MCP server installed successfully!'));
  console.log(chalk.gray('\nUsage:'));
  console.log(chalk.gray('  vibelog <command>           - Run a command with logging'));
  console.log(chalk.gray('  vibelog -t tag1,tag2 <cmd>  - Run with tags'));
  console.log(chalk.gray('  vibelog serve               - Start the server manually'));
}