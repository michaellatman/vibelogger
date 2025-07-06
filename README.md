# VibeLogger

Zero-friction logging system that captures terminal output and browser console logs, streaming them to a local MCP server accessible by Claude Code.

## Quick Start

### Install the CLI

```bash
# Install globally
npm install -g @michaellatman/vibelog

# Or use with npx
npx @michaellatman/vibelog init
```

### Setup

1. **Initialize VibeLogger** (starts server and registers with Claude):
   ```bash
   vibelog init
   ```

2. **Install Chrome Extension**:
   - Clone this repo: `git clone https://github.com/michaellatman/vibelogger.git`
   - Build the extension: `cd vibelogger && pnpm install && pnpm build`
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select `vibelogger/packages/chrome-extension/dist`

## Usage

### CLI - Log Terminal Commands

```bash
# Log any command
vibelog npm test
vibelog python script.py
vibelog curl https://api.example.com

# Open logs directory
vibelog open
```

### Chrome Extension - Log Browser Console

1. Click the VibeLogger extension icon
2. Add sites you want to monitor
3. Console logs and network requests are automatically captured
4. Access logs in Claude Code using `@vibelog`

### Access Logs in Claude Code

```
@vibelog:log://my_app_logs
```

## Features

- 🚀 **Zero Configuration** - Works out of the box
- 📝 **Terminal Logging** - Wrap any command with `vibelog`
- 🌐 **Browser Console Capture** - Chrome extension for web logs
- 🤖 **Claude Integration** - Access logs directly in Claude Code
- 🔄 **Real-time Streaming** - Logs appear instantly
- 🗄️ **Automatic Cleanup** - Logs auto-purge after 4 days
- 🔒 **Local Only** - All data stays on your machine

## Architecture

VibeLogger consists of three main components:

1. **MCP Server** - Local Fastify server (port 51234) that stores logs
2. **CLI Tool** - Command wrapper that captures terminal output
3. **Chrome Extension** - Captures browser console and network logs

## Commands

- `vibelog init` - Initialize VibeLogger and register with Claude
- `vibelog serve` - Start the MCP server manually
- `vibelog open` - Open logs directory in Finder
- `vibelog <command>` - Run any command with logging

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
# Clone the repo
git clone https://github.com/michaellatman/vibelogger.git
cd vibelogger

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development mode
pnpm dev
```

### Project Structure

```
vibelogger/
├── packages/
│   ├── cli/            # CLI tool (vibelog command)
│   ├── chrome-extension/   # Browser console capture
│   ├── mcp-server/     # Local MCP server
│   └── shared/         # Shared types and utilities
```

## Troubleshooting

### Server not starting
- Check if port 51234 is already in use
- Try `vibelog serve` to start manually

### Chrome extension not capturing logs
- Make sure the site is allowlisted in the extension popup
- Check that the server is running (green dot in extension)
- Set VibeLogger debug level to "Verbose" in extension settings

### Claude not finding logs
- Run `vibelog init` to re-register with Claude
- Restart Claude Code after registration

## License

MIT License - see [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Michael Latman ([@michaellatman](https://github.com/michaellatman))