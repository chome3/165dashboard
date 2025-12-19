// functions/static/[[path]].js
// 靜態路徑代理 (Unified Vercel Proxy)
// 原本用於 GAS，現在統一指向 Vercel，避免路徑 404

import { CONFIG } from '../utils';

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // 準備轉發至 Vercel
  const targetUrl = CONFIG.VERCEL_URL + url.pathname + url.search;

  try {
    const proxyHeaders = new Headers();
    const allowedHeaders = ['accept', 'accept-encoding', 'accept-language', 'user-agent', 'referer'];
    allowedHeaders.forEach(header => {
      const value = request.headers.get(header);
      if (value) proxyHeaders.set(header, value);
    });

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      redirect: 'follow',
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(`Static Proxy Error: ${error.message}`, { status: 502 });
  }
}