// functions/index.js
// 根目錄代理邏輯 (Proxy Version)
// 確保訪問根目錄 (/) 時也能正確觸發代理機制

import { isInCidr, INTERNAL_CIDRS, CONFIG } from './utils';

export async function onRequest(context) {
  const request = context.request;
  const ip = request.headers.get('CF-Connecting-IP') || 'N/A';
  const url = new URL(request.url);

  // 檢查是否為內部 IP
  const isInternalIP = INTERNAL_CIDRS.some(cidr => isInCidr(ip, cidr));

  // Debug 模式 (?debug=true)
  if (url.searchParams.get('debug') === 'true') {
    return new Response(
      `[Proxy Mode - Root]\n` +
      `IP: ${ip}\n` +
      `isInternalIP: ${isInternalIP}\n` +
      `Target: ${isInternalIP ? 'GAS' : 'Vercel'}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  if (isInternalIP) {
    // ---------------------------------------------------------
    // 情境 A: 內部網路 -> 代理至 Google Apps Script (GAS)
    // ---------------------------------------------------------
    const targetUrl = CONFIG.GAS_URL + url.search;
    
    const proxyHeaders = new Headers();
    // 轉發必要的標頭
    const allowedHeaders = ['accept', 'accept-language', 'user-agent', 'referer'];
    allowedHeaders.forEach(header => {
      const value = request.headers.get(header);
      if (value) proxyHeaders.set(header, value);
    });
    
    try {
      const modifiedRequest = new Request(targetUrl, {
        method: request.method,
        headers: proxyHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow',
      });
      
      const response = await fetch(modifiedRequest);
      const responseBody = await response.text();
      
      // 修復 GAS 回傳 HTML 中的相對路徑
      // 將 /static/... 改寫為 https://script.google.com/static/... 
      // 避免瀏覽器向我們的 Proxy 請求不存在的資源 (或者透過 functions/static/[[path]].js 處理)
      const fixedBody = responseBody
        .replace(/src="\/static\//g, `src="${CONFIG.GAS_BASE}/static/`)
        .replace(/href="\/static\//g, `href="${CONFIG.GAS_BASE}/static/`)
        .replace(/src='\/static\//g, `src='${CONFIG.GAS_BASE}/static/`)
        .replace(/href='\/static\//g, `href='${CONFIG.GAS_BASE}/static/`);
      
      const responseHeaders = new Headers();
      const importantHeaders = ['content-type', 'cache-control', 'expires'];
      importantHeaders.forEach(header => {
        const value = response.headers.get(header);
        if (value) responseHeaders.set(header, value);
      });
      
      if (!responseHeaders.has('content-type')) {
        responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
      }
      
      // 允許 CORS
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      
      return new Response(fixedBody, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });

    } catch (error) {
      return new Response(`GAS Proxy Error: ${error.message}`, { status: 502 });
    }

  } else {
    // ---------------------------------------------------------
    // 情境 B: 外部網路 -> 代理至 Vercel
    // ---------------------------------------------------------
    
    // 組合目標網址 (保留 pathname 與 search)
    // 注意: 因為這是 index.js, pathname 通常是 /
    const targetUrl = CONFIG.VERCEL_URL + url.pathname + url.search;
    
    const proxyHeaders = new Headers();
    const allowedHeaders = ['accept', 'accept-language', 'content-type', 'user-agent'];
    allowedHeaders.forEach(header => {
      const value = request.headers.get(header);
      if (value) proxyHeaders.set(header, value);
    });
    
    try {
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
}