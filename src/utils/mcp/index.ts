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
const mcpEndpoint = import.meta.env.VITE_MCP_ENDPOINT || '/mcp';

export class ApiError {
  code: number;
  message: string;
  constructor(code: number, message: string) {
    this.code = code;
    this.message = message;
  }
}

// Hook types
export type RequestPreHook = (path: string, data: any, options?: RequestOptions | AxiosRequestConfig) => void;
export type RequestCompleteHook = (path: string, data: any, options?: RequestOptions | AxiosRequestConfig) => void;
export type RequestErrorHook = (apiError: ApiError, path: string, data: any) => void;

// Default empty implementations
let defaultPreHook: RequestPreHook = () => {};
let defaultCompleteHook: RequestCompleteHook = () => {};
let defaultErrorHook: RequestErrorHook = () => {};

// Setters for external configuration
export const setRequestPreHook = (hook: RequestPreHook) => {
  defaultPreHook = hook;
};

export const setRequestCompleteHook = (hook: RequestCompleteHook) => {
  defaultCompleteHook = hook;
};

export const setRequestErrorHook = (hook: RequestErrorHook) => {
  defaultErrorHook = hook;
};

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
const doResult = (toolName: string, data: any, toolResult: CallToolResult): any => {
  if (!toolResult) {
    const apiError = new ApiError(502, `call ${toolName} error: Result is null.`);
    defaultErrorHook(apiError, toolName, data);
    throw apiError;
  } else if (toolResult.isError) {
    if (toolResult.structuredContent) {
      const callResult: any = toolResult.structuredContent;
      const apiError = new ApiError(callResult?.error.code, callResult?.error.message);
      defaultErrorHook(apiError, toolName, data);
      throw apiError;
    } else {
      if (toolResult.content && Array.isArray(toolResult.content)) {
        const content = toolResult.content;
        if (content.length === 0 || content[0].type !== 'text') {
          const apiError = new ApiError(502, `call ${toolName} error: Unable to process the result.`);
          defaultErrorHook(apiError, toolName, data);
          throw apiError;
        } else {
          console.error(`callTool error:${toolName}`, content[0].text);
          const apiError = new ApiError(500, content[0].text);
          defaultErrorHook(apiError, toolName, data);
          throw apiError;
        }
      }
    }
  } else {
    return toolResult.structuredContent;
  }
};

export class McpClient {
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
      if (!accessToken) {
        accessToken = '';
      }
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

  public ping = async (): Promise<void> => {
    const client = await this.getAsyncClient();
    try {
      await client.ping();
    } finally {
      await this.close(client);
    }
  };

  public callTool = async <T = any>(toolName: string, data: any, options?: RequestOptions): Promise<T> => {
    defaultPreHook(toolName, data, options);

    const params: Record<string, any> = data;
    const toolsRequest: CallToolRequest['params'] = {
      name: toolName,
      arguments: params,
    };
    const client = await this.getAsyncClient();
    try {
      const toolResult = await client.callTool(toolsRequest, CallToolResultSchema, options);
      return doResult(toolName, data, toolResult);
    } finally {
      await this.close(client);
      defaultCompleteHook(toolName, data, options);
    }
  };
}

export const callTool = async <T = any>(
  client: Client,
  toolName: string,
  data: any,
  options?: RequestOptions,
): Promise<T> => {
  const params: Record<string, any> = data;
  const toolsRequest: CallToolRequest['params'] = {
    name: toolName,
    arguments: params,
  };
  const toolResult = await client.callTool(toolsRequest, CallToolResultSchema, options);
  return doResult(toolName, data, toolResult);
};

const authCache = {
  accessToken: '',
  refreshAt: 0,
  maxTime: 600000,
};

let defaultAuthProvider = (): Promise<string> => {
  return Promise.resolve('');
};

export const postRequest = async <T = any>(path: string, data: any = {}, config?: AxiosRequestConfig): Promise<T> => {
  defaultPreHook(path, data, config);

  const url = mcpBaseUrl + path;
  try {
    const response = await axios.post<T>(url, data, config);
    const responseData = response.data as any;
    const { error } = responseData;
    if (error) {
      const apiError = new ApiError(error.code, error.message);
      defaultErrorHook(apiError, path, data);
      throw apiError;
    }
    return responseData;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('POST error:', error);
    throw error;
  } finally {
    defaultCompleteHook(path, data, config);
  }
};

export const postRequestWithAuth = async <T = any>(
  path: string,
  data: any = {},
  config?: AxiosRequestConfig,
): Promise<T> => {
  config = config ?? {};
  config.headers = config.headers ?? {};
  config.headers.Authorization = await defaultAuthProvider();
  return postRequest(path, data, config);
};

export const getAccessToken = async () => {
  return await defaultAuthProvider();
};

export const setAccessToken = (accessToken: string) => {
  authCache.accessToken = accessToken;
  authCache.refreshAt = new Date().getTime();
};

export const setDefaultAuthProvider = (authProvider: () => Promise<string>) => {
  defaultAuthProvider = authProvider;
};

export const createAndSetDefaultAuthProvider = (refreshApi: string, refreshToken: string) => {
  defaultAuthProvider = async () => {
    if (new Date().getTime() - authCache.refreshAt <= authCache.maxTime && authCache.accessToken) {
      return authCache.accessToken;
    }
    const tokenResponse = await postRequest<any>(refreshApi, {
      refreshToken,
    });

    if (tokenResponse.error) {
      throw new Error(`${tokenResponse.error.message}`);
    }
    authCache.accessToken = tokenResponse.accessToken;
    authCache.refreshAt = new Date().getTime();
    return tokenResponse.accessToken;
  };
};

export const getMcpClient = async (options?: CreateMcpClientOptions) => {
  options = options ?? {};
  options.baseUrl = options.baseUrl ?? mcpBaseUrl;
  options.mcpEndpoint = options.mcpEndpoint ?? mcpEndpoint;
  options.useWebsocket = options.useWebsocket ?? true;
  options.authProvider = options.authProvider ?? defaultAuthProvider;
  return new McpClient(options);
};
