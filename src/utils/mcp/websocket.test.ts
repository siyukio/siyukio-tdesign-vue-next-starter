import { describe, it } from 'vitest';

import { getMcpClient, mcpBaseUrl, postRequest } from './index';

describe('keepAlive mcp websocket client', async () => {
  const authProvider = async (): Promise<string> => {
    const tokenVo = await postRequest<any>(`${mcpBaseUrl}/authorization/create`, {
      uid: 'admin',
    });
    return tokenVo.authorization;
  };

  const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  it('keepAlive', async () => {
    const mcpClient = await getMcpClient({
      authProvider,
      useWebsocket: true,
    });

    const client = await mcpClient.getAsyncClient();
    try {
      await client.listTools();
      await sleep(60000);
    } finally {
      await mcpClient.close(client);
    }
  }, 120000);
});
