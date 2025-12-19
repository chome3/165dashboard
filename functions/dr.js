// functions/dr.js
// 轉址模式 (Unified Redirect)

import { CONFIG } from './utils';

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // 儀表板檢查
  if (url.searchParams.get('dashboard') === 'true') {
    return Response.redirect(`${url.origin}/?dashboard=true`, 302);
  }

  // Debug 模式
  if (url.searchParams.get('debug') === 'true') {
    const ip = request.headers.get('CF-Connecting-IP') || 'N/A';
    return new Response(
      `[Redirect Mode - /dr]\n` +
      `Strategy: Unified (All to Vercel)\n` +
      `IP: ${ip}\n` +
      `Action: Redirect to Vercel`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // 統一跳轉至 Vercel
  return Response.redirect(CONFIG.VERCEL_URL + url.search, 302);
}