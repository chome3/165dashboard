// functions/dr.js
// 轉址模式 (Redirect Version)

import { isInCidr, INTERNAL_CIDRS, CONFIG } from './utils';

export async function onRequest(context) {
  const request = context.request;
  const ip = request.headers.get('CF-Connecting-IP') || 'N/A';
  const url = new URL(request.url);

  // 防止誤入儀表板模式
  if (url.searchParams.get('dashboard') === 'true') {
    return Response.redirect(`${url.origin}/?dashboard=true`, 302);
  }

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
    return Response.redirect(CONFIG.GAS_URL + url.search, 302);
  } else {
    return Response.redirect(CONFIG.VERCEL_URL + url.search, 302);
  }
}