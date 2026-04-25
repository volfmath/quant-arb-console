import { ProxyAgent, setGlobalDispatcher } from 'undici';

export function configureHttpProxyFromEnv(env: NodeJS.ProcessEnv = process.env): string | null {
  const proxyUrl = getProxyUrl(env);
  if (!proxyUrl) {
    return null;
  }

  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  return proxyUrl;
}

export function getProxyUrl(env: NodeJS.ProcessEnv): string | null {
  return env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy || null;
}
