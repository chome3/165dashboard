// functions/[[path]].js
// 全域代理邏輯 (Catch-all Unified Vercel Proxy)

import { CONFIG } from './utils';

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // 1. 儀表板防呆 (如果在子路徑打 dashboard=true，導回根目錄)
  if (url.searchParams.get('dashboard') === 'true') {
    return Response.redirect(`${url.origin}/?dashboard=true`, 302);
  }

  // 2. 準備轉發至 Vercel
  const targetUrl = CONFIG.VERCEL_URL + url.pathname + url.search;

  // Debug 模式
  if (url.searchParams.get('debug') === 'true') {
    const ip = request.headers.get('CF-Connecting-IP') || 'N/A';
    return new Response(
      `[Proxy Mode - Catch All]\n` +
      `Strategy: Unified (All to Vercel)\n` +
      `Path: ${url.pathname}\n` +
      `IP: ${ip}\n` +
      `Target: ${targetUrl}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // 3. 執行代理
  try {
    const proxyHeaders = new Headers();
    const allowedHeaders = ['accept', 'accept-language', 'content-type', 'user-agent', 'referer'];
    allowedHeaders.forEach(header => {
      const value = request.headers.get(header);
      if (value) proxyHeaders.set(header, value);
    });
    
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });
    
    const response = await fetch(modifiedRequest);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
     return new Response(`Vercel Proxy Error: ${error.message}`, { status: 502 });
  }
}