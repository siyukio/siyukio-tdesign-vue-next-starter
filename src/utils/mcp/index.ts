import type { ClientOptions } from '@modelcontextprotocol/sdk/client/index';
import { Client } from '@modelcontextprotocol/sdk/client/index';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';
import type { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol';
import type {
  CallToolRequest,
  CallToolResult,
  ClientResult,
  CreateMessageRequest,
  ListToolsRequest,
  ListToolsResult,
  ProgressNotification,
} from '@modelcontextprotocol/sdk/types';
import {
  CallToolResultSchema,
  CreateMessageRequestSchema,
  ListToolsResultSchema,
  ProgressNotificationSchema,
} from '@modelcontextprotocol/sdk/types';
import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';

import { StreamableWebsocketClientTransport } from '@/utils/mcp/sdk/client/streamableWebsocket';

export const mcpBaseUrl = import.meta.env.VITE_MCP_BASE_URL || '';
const mcpEndpoint = import.meta.env.VITE_MCP_ENDPOINT || '';

export interface CreateMcpClientOptions {
  baseUrl?: string;
  mcpEndpoint?: string;
  version?: string;
  /**
   * A timeout (in milliseconds) for this request. If exceeded, an McpError with code `RequestTimeout` will be raised from request().
   *
   * If not specified, `60000` will be used as the timeout.
   */
  requestTimeout?: number;
  useWebsocket?: boolean;
  progressHandler?: (progressNotification: ProgressNotification) => void;
  samplingHandler?: (createMessageRequest: CreateMessageRequest) => Promise<ClientResult>;
  authProvider?: () => Promise<string>;
}
const doResult = (toolName: string, toolResult: CallToolResult): any => {
  let callResult: any;
  if (!toolResult) {
    throw new Error(`call ${toolName} error: Result is null.`);
  } else if (toolResult.structuredContent) {
    callResult = toolResult.structuredContent;
  } else {
    if (toolResult.content && Array.isArray(toolResult.content)) {
      const content = toolResult.content;
      if (content.length === 0 || content[0].type !== 'text') {
        console.error(`callTool error:${toolName}`, toolResult);
        throw new Error(`call ${toolName} error: Unable to process the result.`);
      } else {
        callResult = JSON.parse(content[0].text);
      }
    }
  }

  if (toolResult.isError) {
    if (callResult.error) {
      throw new Error(`call ${toolName} error: ${callResult.error.message}`);
    } else {
      const message = JSON.stringify(callResult);
      throw new Error(`call ${toolName} error: ${message}`);
    }
  }
};

export class MyMcpClient {
  private readonly _options: CreateMcpClientOptions;

  constructor(options: CreateMcpClientOptions) {
    this._options = options;
  }

  public getAsyncClient = async (): Promise<Client> => {
    const url = new URL(this._options.baseUrl);
    url.pathname = this._options.mcpEndpoint;
    let accessToken = '';
    if (this._options.authProvider) {
      accessToken = await this._options.authProvider();
    }
    let transport;
    if (this._options.useWebsocket) {
      url.pathname += '/ws';
      if (url.protocol === 'https:') {
        url.protocol = 'wss:';
      } else {
        url.protocol = 'ws:';
      }
      transport = new StreamableWebsocketClientTransport(url, accessToken);
    } else {
      transport = new StreamableHTTPClientTransport(url, {
        requestInit: {
          headers: {
            Authorization: accessToken,
          },
        },
      });
    }

    const clientOptions: ClientOptions = {
      capabilities: {},
    };

    if (this._options.samplingHandler) {
      clientOptions.capabilities.sampling = {};
    }

    const client = new Client(
      {
        name: 'typescript client',
        version: '1.20.2',
      },
      clientOptions,
    );

    if (this._options.samplingHandler) {
      client.setRequestHandler(CreateMessageRequestSchema, this._options.samplingHandler);
    }

    if (this._options.progressHandler) {
      client.setNotificationHandler(ProgressNotificationSchema, this._options.progressHandler);
    }

    await client.connect(transport, {
      timeout: this._options.requestTimeout,
      resetTimeoutOnProgress: true,
    });
    return client;
  };

  public close = async (client: Client): Promise<void> => {
    if (
      client.transport instanceof StreamableHTTPClientTransport ||
      client.transport instanceof StreamableWebsocketClientTransport
    ) {
      await client.transport.terminateSession();
    }
    await client.close();
  };

  public listTools = async (): Promise<ListToolsResult> => {
    const client = await this.getAsyncClient();
    const toolsRequest: ListToolsRequest = {
      method: 'tools/list',
      params: {},
    };
    try {
      return await client.request(toolsRequest, ListToolsResultSchema);
    } finally {
      await this.close(client);
    }
  };

  public callTool = async (toolName: string, data: any, options?: RequestOptions): Promise<any> => {
    const params: Record<string, any> = data;
    const toolsRequest: CallToolRequest['params'] = {
      name: toolName,
      arguments: params,
    };
    const client = await this.getAsyncClient();
    try {
      const toolResult = await client.callTool(toolsRequest, CallToolResultSchema, options);
      return doResult(toolName, toolResult);
    } finally {
      await this.close(client);
    }
  };
}

export const callTool = async (client: Client, toolName: string, data: any, options?: RequestOptions): Promise<any> => {
  const params: Record<string, any> = data;
  const toolsRequest: CallToolRequest['params'] = {
    name: toolName,
    arguments: params,
  };
  const toolResult = await client.callTool(toolsRequest, CallToolResultSchema, options);
  return doResult(toolName, toolResult);
};

export const postRequest = async <T = any>(url: string, data: any = {}, config?: AxiosRequestConfig): Promise<T> => {
  try {
    const response = await axios.post<T>(url, data, config);
    return response.data;
  } catch (error: any) {
    console.error('POST error:', error);
    throw error;
  }
};

export const getMcpClient = async (options?: CreateMcpClientOptions) => {
  if (options && !options.baseUrl) {
    options.baseUrl = mcpBaseUrl;
  }
  if (options && !options.mcpEndpoint) {
    options.mcpEndpoint = mcpEndpoint;
  }
  return new MyMcpClient(options);
};
