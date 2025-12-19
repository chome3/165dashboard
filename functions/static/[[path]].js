// functions/static/[[path]].js
import { isInCidr, INTERNAL_CIDRS, CONFIG } from '../utils';

export async function onRequest(context) {
  const request = context.request;
  const ip = request.headers.get('CF-Connecting-IP') || 'N/A';
  const url = new URL(request.url);

  const isInternalIP = INTERNAL_CIDRS.some(cidr => isInCidr(ip, cidr));

  // 安全檢查: 僅允許內網存取 GAS 靜態資源
  if (!isInternalIP) {
    return new Response('Forbidden: Internal Access Only', { status: 403 });
  }

  // 重構目標 URL
  const targetUrl = CONFIG.GAS_BASE + url.pathname + url.search;

  const proxyHeaders = new Headers();
  const allowedHeaders = ['accept', 'accept-encoding', 'accept-language', 'user-agent', 'referer'];
  allowedHeaders.forEach(header => {
    const value = request.headers.get(header);
    if (value) proxyHeaders.set(header, value);
  });

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      redirect: 'follow',
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Cache-Control', 'public, max-age=3600');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(`Static Proxy Error: ${error.message}`, { status: 502 });
  }
}