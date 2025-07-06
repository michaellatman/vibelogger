VibeLogger Product Requirements Document

Project Name: LLM-Ready Local Log Server
Version: 1.0  Date: 2025-07-06  Author: (you)

⸻

1 · Executive Summary

Develop a zero-friction logging system that copies everything a developer’s terminal or filtered browser tab prints, streams it to a single local server, and exposes those logs to Claude Code through the MCP protocol.
Logs are kept for 4 days max, then auto-deleted.
Claude can then pull exactly the slice it needs (tail, head, since) without freezing the IDE.

### Reference Documentation

- **Model Context Protocol (MCP)**: [Official Documentation](https://modelcontextprotocol.io/introduction) | [Protocol Specification](https://spec.modelcontextprotocol.io/specification/2024-11-05/)
- **Claude Tool Use**: [Overview](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) | [Implementation Guide](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use)
- **Fastify**: [Official Documentation](https://fastify.dev/docs/latest/) | [npm Package](https://www.npmjs.com/package/fastify) | [Getting Started](https://fastify.dev/docs/latest/Guides/Getting-Started/)
- **MCP Server npm Packages**: [Server Everything](https://www.npmjs.com/package/@modelcontextprotocol/server-everything) | [Server Filesystem](https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem) | [Create Server](https://www.npmjs.com/package/@modelcontextprotocol/create-server)

⸻

2 · Goals & Non-Goals

	Included	Not included
Capture stdout / stderr / (opt-in) stdin from any CLI command	✅	
Capture browser console + network events for chosen origin	✅	Full HAR capture
Local MCP server with resources list + get_log tool	✅	Remote / cloud server
No manual setup inside Claude (wrapper auto-registers MCP)	✅	Multi-user permissions
Disk self-management (purge > 4 days)	✅	Long-term archiving
Live “follow” streaming	❌ (dropped)	


⸻

3 · User Stories
	1.	Dev John wants to run pnpm run dev exactly as usual yet later ask Claude “show me the last 100 build lines”.
	2.	Dev Sara hits F12 in Chrome, sees API errors, and wants those to be part of the same log Claude reads.
	3.	Dev Lee doesn’t want to worry about cleaning 30 GB of old logs—anything > 4 days should vanish automatically.
	4.	Dev Alex types @build in Claude and instantly gets an autocomplete entry without downloading the whole file.
	5.	Dev Priya resets her laptop; on the next command the server auto-starts and re-registers with Claude—no extra clicks.

⸻

4 · Functional Requirements

4.1 CLI Wrapper (vibelog)

ID	Requirement
WR-1	Accept --tags tag1,tag2 (comma list).
WR-2	Derive name = first tag else basename(argv[0]).
WR-3	Spawn child in PTY; forward bytes unchanged to user.
WR-4	Stream ND-JSON lines to POST /ingest/{name} (chunked HTTP).
WR-5	If 51234 closed, auto-spawn vibelog serve (lockfile).
WR-6	Buffer offline lines to ~/.cache/vibelog/{name}.buffer; retry.
WR-7	vibelog init launches server (if absent) and runs claude mcp add logs http://localhost:51234.

4.2 Chrome Extension

ID	Requirement
EXT-1	Options page: Base URL, Tags, enable/disable.
EXT-2	Content script patches console.* → postMessage.
EXT-3	Service-worker batches messages + webRequest events; every 500 ms POST /ingest/browser.
EXT-4	Store unsent batches in chrome.storage.local if server unreachable.

4.3 Log Server

ID	Requirement
SRV-1	Single Fastify process on 127.0.0.1:51234.
SRV-2	POST /ingest/{name} appends to logs/{name}.ndjson, updates in-mem index.
SRV-3	On startup purge any *.ndjson whose mtime < (now-4 days).
SRV-4	POST /mcp/resources/list returns IDs + metadata only.
SRV-5	POST /mcp/tools/get_log returns text slice (supports tail, head, since).
SRV-6	Serve MCP manifest.json (lists get_log, optional list_logs).
SRV-7	Log directory path: $XDG_STATE_HOME/vibelog/logs or fallback ~/.local/state/vibelog/logs.


⸻

5 · Non-Functional Requirements

Category	NFR
Performance	resources/list must respond < 50 ms with 100 resources.
Disk	Auto-purge guarantees total disk use ≤ size of 4 days of activity.
Security	Server listens on localhost only. CLI flag --no-stdin disables keystroke capture.
Portability	Node ≥ 18, Works on Linux, macOS, Windows.
Reliability	Buffered retry ensures no log loss if server starts late.
Usability	Running vibelog on a command must feel identical to running the command alone.


⸻

6 · API & Data Schema

6.1 ND-JSON record

{"ts":1720490640123,"stream":"stdout","data":"U29tZSByYXcgc3RyaW5nCg==","tags":["build"]}

6.2 POST /ingest/{name}

Chunked, Content-Type: application/x-ndjson

6.3 POST /mcp/resources/list Response

{
  "resources":[
    {
      "uri":"log://build",
      "name":"build",
      "mimeType":"text/plain",
      "props":{
        "started":"2025-07-04T13:12:17Z",
        "last_ts":"2025-07-04T18:45:12Z",
        "line_count":38291,
        "size_bytes":4573892,
        "tags":["build"]
      }
    }
  ]
}

6.4 get_log Tool

Input

{ "id":"build", "fmt":"text", "tail":200, "since":"2025-07-04T18:45:00Z" }

Output

{ "content":"<plain-text slice here>" }


⸻

7 · Key Code Snippets

7.1 Wrapper → PTY & Stream

import pty from 'node-pty';
import fetch from 'node-fetch';
import { Buffer } from 'buffer';
const child = pty.spawn(cmd[0], cmd.slice(1), { name:'xterm-256color' });
const stream = fetch(`http://localhost:51234/ingest/${name}`, {
  method:'POST', headers:{'Content-Type':'application/x-ndjson'},
  body:new ReadableStream({
    start(ctrl) {
      child.onData(d=>{
        process.stdout.write(d);
        ctrl.enqueue(JSON.stringify({ts:Date.now(),stream:'stdout',
          data:Buffer.from(d).toString('base64'),tags})+'\n');
      });
      child.onExit(({exitCode})=>{
        ctrl.enqueue(JSON.stringify({ts:Date.now(),event:'exit',code:exitCode})+'\n');
        ctrl.close();
        process.exit(exitCode);
      });
    }
  })
});

7.2 Server · Purge Old Logs

async function purgeOld(dir:string,d=4){
  const cutoff=Date.now()-d*864e5;
  for(const f of await fg('*.ndjson',{cwd:dir,absolute:true}))
    try{ if(statSync(f).mtimeMs<cutoff) unlinkSync(f);}catch{}
}

7.3 resources/list Route

fastify.post('/mcp/resources/list', async (_, reply)=>{
  const now=Date.now();
  reply.send({
    resources:Object.values(index).map(r=>({
      uri:`log://${r.id}`,
      name:r.id,
      mimeType:'text/plain',
      props:{
        started:r.started,
        last_ts:new Date(r.last_ts).toISOString(),
        line_count:r.line_count,
        size_bytes:r.size_bytes,
        tags:r.tags,
        secs_since_activity:Math.floor((now-r.last_ts)/1000)
      }
    }))
  });
});

7.4 get_log Slice Helper

async function readSlice(id,{tail,head,sinceMs}:{tail?:number;head?:number;sinceMs?:number}){
  const lines=[];
  for await (const line of readLines(`logs/${id}.ndjson`)){
    const rec=JSON.parse(line);
    if(!sinceMs||rec.ts>=sinceMs) lines.push(line);
  }
  const slice=tail?lines.slice(-tail):head?lines.slice(0,head):lines;
  return stripAnsi(slice.join('\n'));
}




⸻

8 · Implementation Tasks & Status

| ID | Task | Status | Priority | Notes |
|----|------|--------|----------|-------|
| 1 | Set up pnpm monorepo structure with packages for chrome-extension, mcp-server, and shared models | 🟢 Completed | High | Created pnpm workspace with 4 packages: shared, mcp-server, chrome-extension, cli |
| 2 | Create shared package with common models and types | 🟢 Completed | High | Added types, utils, and constants for LogRecord, ChromeMessage, MCP interfaces |
| 3 | Set up MCP server with Fastify (port 51234) | 🟢 Completed | High | Created Fastify server with cors, logging, and graceful shutdown |
| 4 | Implement POST /ingest/{name} endpoint for log ingestion | 🟢 Completed | High | Streaming NDJSON endpoint with line-by-line processing |
| 5 | Implement MCP resources/list endpoint | 🟢 Completed | Medium | Returns log metadata with activity timing |
| 6 | Implement MCP get_log tool with tail/head/since support | 🟢 Completed | Medium | Supports text/json format with filtering options |
| 7 | Add automatic log purging (4 days retention) | 🟢 Completed | Medium | Hourly scheduler removes logs older than 4 days |
| 8 | Create Chrome extension manifest and structure | 🟢 Completed | High | Created manifest v3 with Vite build setup |
| 9 | Implement Chrome extension popup with allowlist configuration | 🟢 Completed | High | React popup with domain management and tagging |
| 10 | Create content script for console patching and message collection | 🟢 Completed | Medium | Patches console methods and captures errors |
| 11 | Implement service worker for batching and sending logs | 🟢 Completed | Medium | Batches logs every 500ms with retry logic |
| 12 | Add offline buffering for both extension and CLI | 🟢 Completed | Low | Chrome extension stores in chrome.storage.local, CLI buffers to ~/.cache/vibelog |
| 13 | Create CLI wrapper (vibelog) with PTY spawning | 🟢 Completed | Medium | Full PTY support with stdin/stdout/stderr capture |
| 14 | Implement vibelog init command for Claude MCP registration | 🟢 Completed | Low | Auto-starts server and registers with Claude CLI |

Legend: 🔴 Pending | 🟡 In Progress | 🟢 Completed

⸻

End of PRD