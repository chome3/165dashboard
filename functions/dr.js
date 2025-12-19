// functions/dr.js
// 轉址模式 (Redirect Version)
// 訪問 /dr 時，直接回傳 HTTP 302 跳轉至目標網址

import { isInCidr, INTERNAL_CIDRS, CONFIG } from './utils';

export async function onRequest(context) {
  const request = context.request;
  const ip = request.headers.get('CF-Connecting-IP') || 'N/A';
  const url = new URL(request.url);

  const isInternalIP = INTERNAL_CIDRS.some(cidr => isInCidr(ip, cidr));

  // Debug 模式
  if (url.searchParams.get('debug') === 'true') {
    return new Response(
      `[Redirect Mode - /dr]\n` +
      `IP: ${ip}\n` +
      `isInternalIP: ${isInternalIP}\n` +
      `Action: Redirect to ${isInternalIP ? 'GAS' : 'Vercel'}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  if (isInternalIP) {
    // 內部 -> 302 跳轉至 GAS
    const targetUrl = CONFIG.GAS_URL + url.search;
    return Response.redirect(targetUrl, 302);
  } else {
    // 外部 -> 302 跳轉至 Vercel
    const targetUrl = CONFIG.VERCEL_URL + url.search;
    return Response.redirect(targetUrl, 302);
  }
}