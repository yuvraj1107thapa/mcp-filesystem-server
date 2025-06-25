import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

class MCPClient {
  constructor(serverUrl = 'ws://localhost:3001') {
    this.serverUrl = serverUrl;
    this.ws = null;
    this.pendingRequests = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);
      
      this.ws.on('open', () => {
        console.log('Connected to MCP server');
        resolve();
      });
      
      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
      
      this.ws.on('message', (data) => {
        try {
          const response = JSON.parse(data);
          const requestId = response.id;
          
          if (this.pendingRequests.has(requestId)) {
            const { resolve, reject } = this.pendingRequests.get(requestId);
            this.pendingRequests.delete(requestId);
            
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          }
        } catch (error) {
          console.error('Error parsing response:', error);
        }
      });
      
      this.ws.on('close', () => {
        console.log('Disconnected from MCP server');
      });
    });
  }

  async sendRequest(method, params = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to server');
    }

    const requestId = uuidv4();
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      this.ws.send(JSON.stringify(request));
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  // Filesystem operations
  async createFile(filePath, content = '') {
    return await this.sendRequest('filesystem_create', { filePath, content });
  }

  async editFile(filePath, content) {
    return await this.sendRequest('filesystem_edit', { filePath, content });
  }

  async deleteFile(filePath) {
    return await this.sendRequest('filesystem_delete', { filePath });
  }

  async listFiles(dirPath = '') {
    return await this.sendRequest('filesystem_list', { dirPath });
  }

  async readFile(filePath) {
    return await this.sendRequest('filesystem_read', { filePath });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Example usage
async function example() {
  const client = new MCPClient();
  
  try {
    await client.connect();
    
    // Create a file
    await client.createFile('test.txt', 'Hello, MCP!');
    console.log('File created');
    
    // Read the file
    const fileContent = await client.readFile('test.txt');
    console.log('File content:', fileContent.content);
    
    // List files
    const files = await client.listFiles();
    console.log('Files:', files.files);
    
    // Edit the file
    await client.editFile('test.txt', 'Hello, MCP! Updated content.');
    console.log('File edited');
    
    // Read updated content
    const updatedContent = await client.readFile('test.txt');
    console.log('Updated content:', updatedContent.content);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.disconnect();
  }
}

// Run example if this file is executed directly
if (process.argv[1] === import.meta.url.slice(7)) {
  example();
}

export default MCPClient;