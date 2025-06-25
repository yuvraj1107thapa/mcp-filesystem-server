import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Storage directory for uploaded files
const STORAGE_DIR = path.join(__dirname, '../storage');

// Ensure storage directory exists
try {
  await fs.access(STORAGE_DIR);
} catch {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

// MCP Server Implementation
class MCPServer {
  constructor() {
    this.tools = {
      'filesystem_create': this.createFile.bind(this),
      'filesystem_edit': this.editFile.bind(this),
      'filesystem_delete': this.deleteFile.bind(this),
      'filesystem_list': this.listFiles.bind(this),
      'filesystem_read': this.readFile.bind(this)
    };
  }

  async createFile(params) {
    const { filePath, content = '' } = params;
    const fullPath = path.join(STORAGE_DIR, filePath);
    
    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(fullPath, content, 'utf8');
    return { success: true, message: `File created: ${filePath}` };
  }

  async editFile(params) {
    const { filePath, content } = params;
    const fullPath = path.join(STORAGE_DIR, filePath);
    
    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }
    
    await fs.writeFile(fullPath, content, 'utf8');
    return { success: true, message: `File edited: ${filePath}` };
  }

  async deleteFile(params) {
    const { filePath } = params;
    const fullPath = path.join(STORAGE_DIR, filePath);
    
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      await fs.rmdir(fullPath, { recursive: true });
    } else {
      await fs.unlink(fullPath);
    }
    
    return { success: true, message: `File deleted: ${filePath}` };
  }

  async listFiles(params) {
    const { dirPath = '' } = params;
    const fullPath = path.join(STORAGE_DIR, dirPath);
    
    const files = await fs.readdir(fullPath, { withFileTypes: true });
    const fileList = files.map(file => ({
      name: file.name,
      type: file.isDirectory() ? 'directory' : 'file',
      path: path.join(dirPath, file.name)
    }));
    
    return { success: true, files: fileList };
  }

  async readFile(params) {
    const { filePath } = params;
    const fullPath = path.join(STORAGE_DIR, filePath);
    
    const content = await fs.readFile(fullPath, 'utf8');
    return { success: true, content, filePath };
  }

  async handleRequest(request) {
    try {
      const { method, params } = request;
      
      if (!this.tools[method]) {
        throw new Error(`Unknown method: ${method}`);
      }
      
      const result = await this.tools[method](params);
      return {
        jsonrpc: '2.0',
        id: request.id,
        result
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32000,
          message: error.message
        }
      };
    }
  }
}

const mcpServer = new MCPServer();

// REST API endpoints
app.post('/api/mcp', async (req, res) => {
  try {
    const response = await mcpServer.handleRequest(req.body);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket server for real-time communication
const server = app.listen(PORT, () => {
  console.log(`MCP Server running on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected to MCP server');
  
  ws.on('message', async (data) => {
    try {
      const request = JSON.parse(data);
      const response = await mcpServer.handleRequest(request);
      ws.send(JSON.stringify(response));
    } catch (error) {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' }
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected from MCP server');
  });
});

export default app;