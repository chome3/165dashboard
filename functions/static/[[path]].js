// functions/static/[[path]].js
// 靜態資源代理 (Asset Proxy)
// 用於處理 GAS 頁面中引用的 /static/* 資源

import { isInCidr, INTERNAL_CIDRS, CONFIG } from '../utils';

export async function onRequest(context) {
  const request = context.request;
  const ip = request.headers.get('CF-Connecting-IP') || 'N/A';
  const url = new URL(request.url);

  const isInternalIP = INTERNAL_CIDRS.some(cidr => isInCidr(ip, cidr));

  // 安全檢查: 僅允許內部 IP 使用此代理取得靜態資源
  if (!isInternalIP) {
    return new Response('Forbidden: Internal Access Only', { status: 403 });
  }

  // 建構目標 URL: https://script.google.com/static/...
  // Cloudflare 會將匹配到的路徑保留在 url.pathname 中
  const targetUrl = CONFIG.GAS_BASE + url.pathname + url.search;

  const proxyHeaders = new Headers();
  const allowedHeaders = ['accept', 'accept-encoding', 'accept-language', 'user-agent', 'referer', 'if-none-match', 'if-modified-since'];
  allowedHeaders.forEach(header => {
    const value = request.headers.get(header);
    if (value) proxyHeaders.set(header, value);
  });

  try {
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      redirect: 'follow',
    });

    const response = await fetch(modifiedRequest);
    const responseHeaders = new Headers(response.headers);
    
    // CORS 設定
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    
    // 設定快取以提升效能
    responseHeaders.set('Cache-Control', 'public, max-age=3600');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(`Static Proxy Error: ${error.message}`, { status: 502 });
  }
}