// functions/index.js
// 根目錄代理邏輯 (Proxy Version)

import { isInCidr, INTERNAL_CIDRS, CONFIG } from './utils';

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // 特殊功能：如果網址帶有 ?dashboard=true，則顯示儀表板 (index.html)
  if (url.searchParams.get('dashboard') === 'true') {
    return context.next();
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'N/A';
  const isInternalIP = INTERNAL_CIDRS.some(cidr => isInCidr(ip, cidr));

  // Debug 模式
  if (url.searchParams.get('debug') === 'true') {
    return new Response(
      `[Proxy Mode - Root]\n` +
      `IP: ${ip}\n` +
      `isInternalIP: ${isInternalIP}\n` +
      `Target: ${isInternalIP ? 'GAS (Internal)' : 'Vercel (External)'}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // 決定目標網址
  let targetUrl;
  if (isInternalIP) {
    targetUrl = CONFIG.GAS_URL + url.search;
  } else {
    // 外網 -> Vercel 根目錄
    targetUrl = CONFIG.VERCEL_URL + url.pathname + url.search;
  }

  // 執行代理請求
  try {
    const proxyHeaders = new Headers();
    // 複製必要的 Header，避免複製 Cloudflare 內部 Header 導致錯誤
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
    
    // 如果是內網且回傳 HTML，需要修正靜態資源路徑
    if (isInternalIP && response.headers.get('content-type')?.includes('text/html')) {
        const responseBody = await response.text();
        const fixedBody = responseBody
            .replace(/src="\/static\//g, `src="${CONFIG.GAS_BASE}/static/`)
            .replace(/href="\/static\//g, `href="${CONFIG.GAS_BASE}/static/`)
            .replace(/src='\/static\//g, `src='${CONFIG.GAS_BASE}/static/`)
            .replace(/href='\/static\//g, `href='${CONFIG.GAS_BASE}/static/`);
            
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        
        return new Response(fixedBody, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });
    }

    // 一般轉發 (外網或非 HTML)
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { status: 502 });
  }
}