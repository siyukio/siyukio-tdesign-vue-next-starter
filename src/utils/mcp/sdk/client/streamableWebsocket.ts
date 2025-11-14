import type { Transport } from '@modelcontextprotocol/sdk/shared/transport';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types';
import {
  isInitializedNotification,
  isJSONRPCRequest,
  isJSONRPCResponse,
  JSONRPCMessageSchema,
} from '@modelcontextprotocol/sdk/types';

class CompletableFuture<T> {
  private _resolve!: (value: T | PromiseLike<T>) => void;
  private _reject!: (reason?: any) => void;
  private _isCompleted = false;

  readonly promise: Promise<T>;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  complete = (value: T) => {
    if (!this._isCompleted) {
      this._isCompleted = true;
      this._resolve(value);
    }
  };

  completeExceptionally = (reason: any) => {
    if (!this._isCompleted) {
      this._isCompleted = true;
      this._reject(reason);
    }
  };

  join = (): Promise<T> => {
    return this.promise;
  };
}

interface WebSocketMessage {
  id: string;
  mcpSessionId?: string;
  method?: string;
  body?: Record<string, any>;
}

class WebSocketClient {
  private _socket?: WebSocket;

  private _pendingMap: Map<string, CompletableFuture<WebSocketMessage>> = new Map();

  private _incomingSink: (message: WebSocketMessage) => void;

  close = () => {
    this._socket?.close();
    this._pendingMap.clear();
    this._incomingSink = null;
  };

  private sendText = (text: string) => {
    this._socket?.send(text);
  };

  private handleText = (text: string) => {
    console.debug(`handleText: ${text}`);
    const receivedMessage = JSON.parse(text) as WebSocketMessage;
    const furute = this._pendingMap.get(receivedMessage.id);
    if (furute) {
      this._pendingMap.delete(receivedMessage.id);
      furute.complete(receivedMessage);
    } else {
      this._incomingSink?.(receivedMessage);
    }
  };

  connect = async (url: URL, auth: string): Promise<void> => {
    if (this._socket) {
      throw new Error('If using WebsocketClient class, note that connect() calls start() automatically.');
    }
    const future = new CompletableFuture<void>();

    this._socket = new WebSocket(url, auth);

    this._socket.onerror = (event) => {
      const error = 'error' in event ? (event.error as Error) : new Error(`WebSocket error: ${JSON.stringify(event)}`);
      future.completeExceptionally(error);
    };

    this._socket.onopen = () => {
      future.complete();
    };

    this._socket.onclose = (ev: CloseEvent) => {
      if (ev.reason) {
        console.error('WebSocket closed:', ev.reason);
      }
      future.complete();
    };

    this._socket.onmessage = (event: MessageEvent) => {
      this.handleText(event.data);
    };

    return future.join();
  };

  sendAsync = (requestMessage: WebSocketMessage): Promise<WebSocketMessage> => {
    const future = new CompletableFuture<WebSocketMessage>();
    this._pendingMap.set(requestMessage.id, future);
    const text = JSON.stringify(requestMessage);
    this.sendText(text);
    return future.join();
  };

  receiveAsync = (incomingSink: (message: WebSocketMessage) => void) => {
    this._incomingSink = incomingSink;
  };
}

export class StreamableWebsocketClientTransport implements Transport {
  private _webSocketClient: WebSocketClient;
  private readonly _url: URL;
  private readonly _auth: string;
  private _sessionId: string;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(url: URL, auth: string) {
    this._url = url;
    this._auth = auth;
    this._webSocketClient = new WebSocketClient();
  }

  get sessionId() {
    return this._sessionId;
  }

  start = async (): Promise<void> => {
    await this._webSocketClient.connect(this._url, this._auth);
  };

  close = async (): Promise<void> => {
    this._webSocketClient.close();
  };

  private customize = (method: string, mcpSessionId: string, body: JSONRPCMessage) => {
    const id = crypto.randomUUID();
    if (method) {
      return {
        id,
        method,
        mcpSessionId,
      };
    } else if (mcpSessionId) {
      return {
        id,
        mcpSessionId,
        body,
      };
    } else {
      return {
        id,
        body,
      };
    }
  };

  private reconnect = () => {
    console.debug('start receiveAsync...');
    this._webSocketClient.receiveAsync((receivedMessage: WebSocketMessage) => {
      const message = JSONRPCMessageSchema.parse(receivedMessage.body);
      if (isInitializedNotification(message) || isJSONRPCRequest(message)) {
        this.onmessage?.(message);
      }
    });
  };

  send = async (message: JSONRPCMessage): Promise<void> => {
    const sentMessage = this.customize(null, this._sessionId, message);
    const receivedMessage = await this._webSocketClient.sendAsync(sentMessage);
    if (receivedMessage.mcpSessionId && receivedMessage.mcpSessionId !== '') {
      this._sessionId = receivedMessage.mcpSessionId;
      // Once we have a session, we try to open an async stream for
      // the server to send notifications and requests out-of-band.
      this.reconnect();
    }

    if (!receivedMessage.body || receivedMessage.body.length === 0) {
      console.debug('');
    } else {
      const mcpMessage = JSONRPCMessageSchema.parse(receivedMessage.body);
      if (isJSONRPCResponse(receivedMessage)) {
        const error = receivedMessage.body.error;
        if (error) {
          throw new Error(`Error to endpoint : ${error.message}`);
        }
      }
      this.onmessage?.(mcpMessage);
    }
  };

  terminateSession = async (): Promise<void> => {
    const sentMessage = this.customize('delete', this._sessionId, null);
    this._sessionId = null;
    await this._webSocketClient.sendAsync(sentMessage);
  };
}
