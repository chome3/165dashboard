export async function onRequest(context) {
  const request = context.request;
  const ip = request.headers.get('CF-Connecting-IP') || 'N/A';
  const url = new URL(request.url);

  const isInternalIP = ip === '60.249.9.184';

  const gasUrl = 'https://script.google.com/a/*/macros/s/AKfycbzSwrTccdwz9bH2CwzUoWAIs51IdmKoHF00c7syhKK9BPaSEamuT1ON_DVXpZlKXy_z/exec';
  const vercelUrl = 'https://fraud-analysis-dashboard.vercel.app';

  if (url.searchParams.get('debug') === 'true') {
    return new Response(
      `IP: ${ip}\n` +
      `isInternalIP: ${isInternalIP}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  if (isInternalIP) {
    // 直接 302 轉向到 GAS（瀏覽器網址會變成 GAS）
    return Response.redirect(gasUrl + url.search, 302);
  } else {
    // 外網照舊走 Vercel
    return Response.redirect(vercelUrl + url.pathname + url.search, 302);
  }
}
