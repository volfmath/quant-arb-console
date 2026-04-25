import { describe, expect, it } from 'vitest';
import { getProxyUrl } from '../src/config/http-proxy';

describe('http proxy config', () => {
  it('prefers HTTPS proxy settings for exchange HTTP clients', () => {
    expect(
      getProxyUrl({
        HTTP_PROXY: 'http://127.0.0.1:1000',
        HTTPS_PROXY: 'http://127.0.0.1:15236',
      } as NodeJS.ProcessEnv),
    ).toBe('http://127.0.0.1:15236');
  });

  it('falls back to HTTP proxy and allows direct access', () => {
    expect(getProxyUrl({ HTTP_PROXY: 'http://127.0.0.1:1000' } as NodeJS.ProcessEnv)).toBe(
      'http://127.0.0.1:1000',
    );
    expect(getProxyUrl({} as NodeJS.ProcessEnv)).toBeNull();
  });
});
