import type { CreateMessageRequest, ProgressNotification } from '@modelcontextprotocol/sdk/types';
import { describe, expect, it } from 'vitest';

import { callTool, getMcpClient, mcpBaseUrl, postRequest, setDefaultAuthProvider } from './index';

describe('mcp websocket client', async () => {
  const authProvider = async (): Promise<string> => {
    const tokenResponse = await postRequest<any>(`${mcpBaseUrl}/authorization/create`, {
      uid: 'admin',
    });
    return tokenResponse.accessToken;
  };

  setDefaultAuthProvider(authProvider);

  it('listTools', async () => {
    const mcpClient = await getMcpClient({ useWebsocket: true });
    const listToolsResult = await mcpClient.listTools();
    console.info(listToolsResult.tools);
    expect(listToolsResult.tools.length).toBeGreaterThan(0);
  });

  it('mcp ping', async () => {
    const mcpClient = await getMcpClient({
      useWebsocket: true,
    });
    await mcpClient.ping();
  });

  it('mcp multi ping', async () => {
    const mcpClient = await getMcpClient({
      useWebsocket: true,
    });
    const client = await mcpClient.getAsyncClient();
    try {
      for (let index = 0; index < 3; index++) {
        await client.ping();
      }
    } finally {
      await mcpClient.close(client);
    }
  });

  it('mcp callTool', async () => {
    const mcpClient = await getMcpClient({
      useWebsocket: true,
    });
    const result = await mcpClient.callTool('authorization.create', { uid: 'hello' });
    console.info(result);
  });

  it('mcp multi callTool', async () => {
    const mcpClient = await getMcpClient({
      useWebsocket: true,
    });
    const client = await mcpClient.getAsyncClient();
    try {
      for (let index = 0; index < 3; index++) {
        const result = await callTool(client, 'authorization.create', { uid: 'hello' }, {});
        console.info(result);
      }
    } finally {
      await mcpClient.close(client);
    }
  });

  it('mcp callTool sampling', async () => {
    const mcpClient = await getMcpClient({
      useWebsocket: true,
      samplingHandler: async (createMessageRequest: CreateMessageRequest) => {
        console.info('on createMessageRequest', createMessageRequest);
        return {
          model: 'test-model',
          role: 'assistant',
          content: {
            type: 'text',
            text: 'This is a test response',
          },
        };
      },
    });
    const result = await mcpClient.callTool('token.get', {});
    console.info(result);
  });

  it('mcp multi callTool sampling', async () => {
    const mcpClient = await getMcpClient({
      useWebsocket: true,
      samplingHandler: async (createMessageRequest: CreateMessageRequest) => {
        console.info('on multi createMessageRequest', createMessageRequest);
        return {
          model: 'test-model',
          role: 'assistant',
          content: {
            type: 'text',
            text: 'This is a test response',
          },
        };
      },
    });

    const client = await mcpClient.getAsyncClient();
    try {
      for (let index = 0; index < 3; index++) {
        const result = await callTool(client, 'token.get', {}, {});
        console.info(result);
      }
    } finally {
      await mcpClient.close(client);
    }
  });

  it('mcp callTool progress', async () => {
    const mcpClient = await getMcpClient({
      useWebsocket: true,
      progressHandler: (progressNotification: ProgressNotification) => {
        console.info('on progressNotification', progressNotification);
      },
    });
    const result = await mcpClient.callTool('token.getByProgress', {});
    console.info(result);
  });

  it('mcp multi callTool progress', async () => {
    const mcpClient = await getMcpClient({
      useWebsocket: true,
      progressHandler: (progressNotification: ProgressNotification) => {
        console.info('on multi progressNotification', progressNotification);
      },
    });

    const client = await mcpClient.getAsyncClient();
    try {
      for (let index = 0; index < 3; index++) {
        const result = await callTool(client, 'token.getByProgress', {}, {});
        console.info(result);
      }
    } finally {
      await mcpClient.close(client);
    }
  });
});
