import { beforeEach, describe, expect, it, vi } from 'vitest';

const authorization =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.Yk5VQTl5VFNEbTFmL09lMnNYUE5rRjNBV1lEcTRlazZ4MzRmSjJUek8vZ2ZtN2t3V1d6WFYrRjJ4Y0tnOThZRG14WGtvSytkSzFjdUVwUjdGZys5QTZEUkVPa3R5dk5KdkU3K1FYcHVqUHBrME1VSmtDdjB2eU9kVU9CdFFMTnY2RTJYbWMzZm53PT0.sgTkEf_CIG7lmriOhpm0VXB2BsQRfY6lqX6pyle6-ctwv81DRxEIaaGyJ8uEvsckdd5QeOQCEda98SEm9ctRUw';

describe('simpleAcpClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_ACP_BASE_URL', 'http://localhost:8080');
  });

  it('connects to localhost ACP websocket and initializes with real authorization', async () => {
    const { createSimpleAcpClient, setSimpleAcpClientAuthorization } = await import('./index');
    setSimpleAcpClientAuthorization(authorization);

    const client = await createSimpleAcpClient();

    expect(client.socket.url.startsWith('ws://localhost:8080/acp?accessToken=')).toBe(true);
    expect(client.initializeResponse.protocolVersion).toBe(1);

    client.close();
    await Promise.race([
      client.closed,
      new Promise<void>((resolve) => {
        setTimeout(resolve, 2000);
      }),
    ]);
  });
});
