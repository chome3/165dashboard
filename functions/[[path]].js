// functions/[[path]].js
// 全域代理邏輯 (Catch-all Proxy Version)

import { isInCidr, INTERNAL_CIDRS, CONFIG } from './utils';

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // 儀表板模式：允許訪問靜態資源 (React App)
  if (url.searchParams.get('dashboard') === 'true') {
    return context.next();
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'N/A';
  const isInternalIP = INTERNAL_CIDRS.some(cidr => isInCidr(ip, cidr));

  // Debug 模式
  if (url.searchParams.get('debug') === 'true') {
    return new Response(
      `[Proxy Mode - Catch All]\n` +
      `Path: ${url.pathname}\n` +
      `IP: ${ip}\n` +
      `Target: ${isInternalIP ? 'GAS' : 'Vercel'}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  if (isInternalIP) {
    // 內部網路 -> GAS
    const targetUrl = CONFIG.GAS_URL + url.search;
    
    const proxyHeaders = new Headers();
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
      
      // 重寫 GAS 靜態資源路徑
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
    // 外部網路 -> Vercel
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