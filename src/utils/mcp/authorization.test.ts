import { describe, expect, it } from 'vitest';

import { createAndSetDefaultAuthProvider, getMcpClient } from './index';

describe('authorization mcp websocket client', async () => {
  createAndSetDefaultAuthProvider(
    '/authorization/refresh',
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.a1pVMmtxYURXYU9NYzJmUEVyYmc0a09HZzZHc1Jxb2U3QnZLYnh6ckNjWTBBQis1TDhMVUtEY2l1K1ZGRlVOTENBb2JONzJLZHUyMmZoa25oZDQrcHhUVjlOZDFjV3dRSFIvNFJiMlo2Q2VaNzgwcVNGVElScTNJaDBQL0JuSCtVRTd3ekNTUFNpUXR1bkJKZGRNQzVjWlF4QW89.uCdFG9wvYgzrJarLkQy0SOk76NjFMcITSYDgiZfmYfLOLofLTkMlKA3g7R7wdqkov_HphQRNvSDY_lJjCTIqIQ',
  );

  it('listTools', async () => {
    const mcpClient = await getMcpClient({ useWebsocket: true });
    const listToolsResult = await mcpClient.listTools();
    console.info(listToolsResult.tools);
    expect(listToolsResult.tools.length).toBeGreaterThan(0);
  });
});
