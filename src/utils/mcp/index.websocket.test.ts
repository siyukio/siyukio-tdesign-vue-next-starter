import type { CreateMessageRequest, ProgressNotification } from '@modelcontextprotocol/sdk/types';
import { describe, expect, it } from 'vitest';

import { callTool, getMcpClient, mcpBaseUrl, postRequest } from './index';

describe('mcp websocket client', async () => {
  const authProvider = async (): Promise<string> => {
    const tokenVo = await postRequest<any>(`${mcpBaseUrl}/createAuthorization`, {
      uid: 'admin',
    });
    return tokenVo.authorization;
  };

  it('listTools', async () => {
    const mcpClient = await getMcpClient({ authProvider, useWebsocket: true });
    const listToolsResult = await mcpClient.listTools();
    console.info(listToolsResult.tools);
    expect(listToolsResult.tools.length).toBeGreaterThan(0);
  });

  it('mcp callTool', async () => {
    const mcpClient = await getMcpClient({
      authProvider,
      useWebsocket: true,
    });
    const result = await mcpClient.callTool('/createAuthorization', { uid: 'hello' });
    console.info(result);
  });

  it('mcp multi callTool', async () => {
    const mcpClient = await getMcpClient({
      authProvider,
      useWebsocket: true,
    });
    const client = await mcpClient.getAsyncClient();
    try {
      for (let index = 0; index < 3; index++) {
        const result = await callTool(client, '/createAuthorization', { uid: 'hello' }, {});
        console.info(result);
      }
    } finally {
      await mcpClient.close(client);
    }
  });

  it('mcp callTool sampling', async () => {
    const mcpClient = await getMcpClient({
      authProvider,
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
    const result = await mcpClient.callTool('/getToken', {});
    console.info(result);
  });

  it('mcp multi callTool sampling', async () => {
    const mcpClient = await getMcpClient({
      authProvider,
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
        const result = await callTool(client, '/getToken', {}, {});
        console.info(result);
      }
    } finally {
      await mcpClient.close(client);
    }
  });

  it('mcp callTool progress', async () => {
    const mcpClient = await getMcpClient({
      authProvider,
      useWebsocket: true,
      progressHandler: (progressNotification: ProgressNotification) => {
        console.info('on progressNotification', progressNotification);
      },
    });
    const result = await mcpClient.callTool('/getTokenByProgress', {});
    console.info(result);
  });

  it('mcp multi callTool progress', async () => {
    const mcpClient = await getMcpClient({
      authProvider,
      useWebsocket: true,
      progressHandler: (progressNotification: ProgressNotification) => {
        console.info('on multi progressNotification', progressNotification);
      },
    });

    const client = await mcpClient.getAsyncClient();
    try {
      for (let index = 0; index < 3; index++) {
        const result = await callTool(client, '/getTokenByProgress', {}, {});
        console.info(result);
      }
    } finally {
      await mcpClient.close(client);
    }
  });
});
