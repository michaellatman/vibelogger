import { EventEmitter } from 'events';
import { WebSocket, WebSocketServer } from 'ws';

interface NotificationClient {
  ws: WebSocket;
  id: string;
}

class NotificationManager extends EventEmitter {
  private clients: Map<string, NotificationClient> = new Map();
  private wss: WebSocketServer | null = null;

  initialize(server: any) {
    this.wss = new WebSocketServer({ server, path: '/mcp/notifications' });
    
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = Math.random().toString(36).substring(7);
      const client: NotificationClient = { ws, id: clientId };
      
      this.clients.set(clientId, client);
      console.log(`MCP notification client connected: ${clientId}`);
      
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`MCP notification client disconnected: ${clientId}`);
      });
      
      ws.on('error', (err) => {
        console.error(`MCP notification client error: ${clientId}`, err);
        this.clients.delete(clientId);
      });
    });
  }
  
  // Send notification when resources list changes
  notifyResourcesListChanged() {
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/resources/list-changed',
      params: {}
    };
    
    this.broadcast(notification);
  }
  
  // Send notification when a specific resource is updated
  notifyResourceUpdated(uri: string) {
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/resources/updated',
      params: { uri }
    };
    
    this.broadcast(notification);
  }
  
  private broadcast(message: any) {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }
}

export const notificationManager = new NotificationManager();