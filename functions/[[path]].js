// functions/[[path]].js
// 全域代理邏輯 (Catch-all Proxy Version)

import { isInCidr, INTERNAL_CIDRS, CONFIG } from './utils';

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // 如果使用者在子頁面嘗試開啟儀表板，導回根目錄
  if (url.searchParams.get('dashboard') === 'true') {
    return Response.redirect(`${url.origin}/?dashboard=true`, 302);
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

  // 決定目標
  let targetUrl;
  if (isInternalIP) {
    // 內網：除了根目錄，GAS 通常透過 Query Parameter 控制頁面，
    // 若有特定子路徑需求需在此定義。目前假設全部導向 GAS Exec。
    targetUrl = CONFIG.GAS_URL + url.search;
  } else {
    // 外網：將路徑完整傳遞給 Vercel
    targetUrl = CONFIG.VERCEL_URL + url.pathname + url.search;
  }

  // 執行代理
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

    // 內網 HTML 修正 (與 index.js 相同邏輯)
    if (isInternalIP && response.headers.get('content-type')?.includes('text/html')) {
       const responseBody = await response.text();
       const fixedBody = responseBody
            .replace(/src="\/static\//g, `src="${CONFIG.GAS_BASE}/static/`)
            .replace(/href="\/static\//g, `href="${CONFIG.GAS_BASE}/static/`);
       return new Response(fixedBody, {
           status: response.status,
           headers: responseHeaders
       });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
     return new Response(`Proxy Error: ${error.message}`, { status: 502 });
  }
}