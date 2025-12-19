// functions/index.js
// 根目錄代理邏輯 (Unified Vercel Proxy)

import { CONFIG } from './utils';

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // 1. 儀表板捷徑檢查
  if (url.searchParams.get('dashboard') === 'true') {
    return context.next();
  }

  // 2. 準備轉發至 Vercel
  // 根目錄對應 Vercel 的根目錄
  const targetUrl = CONFIG.VERCEL_URL + url.pathname + url.search;

  // Debug 模式 (選用)
  if (url.searchParams.get('debug') === 'true') {
    const ip = request.headers.get('CF-Connecting-IP') || 'N/A';
    return new Response(
      `[Proxy Mode - Root]\n` +
      `Strategy: Unified (All to Vercel)\n` +
      `IP: ${ip}\n` +
      `Target: ${targetUrl}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // 3. 執行代理
  try {
    const proxyHeaders = new Headers();
    const allowedHeaders = ['accept', 'accept-language', 'user-agent', 'content-type', 'referer'];
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
    
    // 設定 CORS 與回傳
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