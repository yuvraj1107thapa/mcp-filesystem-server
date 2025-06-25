<h1 align="center"><strong>MCP Filesystem Server</strong></h1>

<p align="center">
  Model Context Protocol server for file operations with web frontend
</p>
<p align="center">
  Deployed App Live Demo: <u><a href="https://mcp-filesystem-server.onrender.com" target="_blank">https://mcp-filesystem-server.onrender.com</a></u>
</p>



## Screenshots

**File Management Interface - Upload & Delete Operations**
<img width="960" alt="Image" src="https://github.com/user-attachments/assets/fa0ca6af-5ab4-439c-afaf-01b06c0a6cce" />

**File Editor - Edit & Delete File Operations**
<img width="960" alt="Image" src="https://github.com/user-attachments/assets/c7bda687-35ff-45c0-983d-aed366894231" />

**AI Commands Working**
<img width="960" alt="Image" src="https://github.com/user-attachments/assets/5638f843-cac9-4255-b73d-ff225c95521d" />

<img width="960" alt="Image" src="https://github.com/user-attachments/assets/4a6bbbe3-2dca-4915-b153-bfe0a82fecc7" />

## What This Does

- **MCP Server**: Handles file create/read/edit/delete operations
- **MCP Client**: Connects to server via WebSocket  
- **Web UI**: Upload folders, edit files, run AI commands

## Architecture

```
Browser ←→ MCP Client ←→ MCP Server ←→ File System
```

**Core Components:**
- `server/index.js` - MCP server (Express + WebSocket)
- `client/index.js` - MCP client library
- `public/index.html` - Frontend interface
- `storage/` - File operations sandbox

## Setup

```bash
npm install
npm start
```

Open `http://localhost:3001`

## Usage

**Web Interface:**
1. Upload folder via "Choose Folder"
2. Browse/edit files in explorer
3. Use prompt box for AI commands:
   - "Create config.json with default settings"
   - "Delete all .log files"
   - "Edit README to add usage section"

**Programmatic:**
```javascript
const client = new MCPClient();
await client.connect();

await client.createFile('test.txt', 'content');
const content = await client.readFile('test.txt');
await client.editFile('test.txt', 'new content');
await client.deleteFile('test.txt');
```

## MCP Protocol

Implements JSON-RPC 2.0 over WebSocket:

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "filesystem_create",
  "params": {
    "filePath": "example.txt",
    "content": "Hello World"
  }
}
```

**Supported Methods:**
- `filesystem_create` - Create file
- `filesystem_read` - Read file  
- `filesystem_edit` - Edit file
- `filesystem_delete` - Delete file
- `filesystem_list` - List directory

## Security

- Operations restricted to `storage/` directory
- Input validation on all file paths
- No directory traversal attacks (../ blocked)

## Files

- `server/index.js` - 200 lines, MCP server implementation
- `client/index.js` - 100 lines, WebSocket client wrapper  
- `public/index.html` - 300 lines, frontend with file explorer
- `package.json` - Dependencies: express, ws, cors

## Key Implementation Details

**MCP Server Pattern:**
```javascript
class MCPServer {
  tools = {
    filesystem_create: this.createFile,
    filesystem_read: this.readFile,
    // ...
  }
  
  async handleMessage(message) {
    const tool = this.tools[message.method];
    return await tool(message.params);
  }
}
```

**Client Connection:**
```javascript
class MCPClient {
  constructor() {
    this.ws = new WebSocket('ws://localhost:3001');
  }
  
  async call(method, params) {
    return new Promise((resolve) => {
      this.ws.send(JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params
      }));
    });
  }
}
```

This demonstrates MCP fundamentals: protocol compliance, tool-based architecture, and real-world filesystem integration.