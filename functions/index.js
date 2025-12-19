export async function onRequest(context) {
  const request = context.request;
  const ip = request.headers.get('CF-Connecting-IP') || 'N/A';
  const url = new URL(request.url);

  // 辦公室對外出口 IP（目前偵測到是 60.249.9.184）
  const isInternalIP = ip === '60.249.9.184';

  const gasUrl = 'https://script.google.com/a/*/macros/s/AKfycbzSwrTccdwz9bH2CwzUoWAIs51IdmKoHF00c7syhKK9BPaSEamuT1ON_DVXpZlKXy_z/exec';
  const vercelUrl = 'https://fraud-analysis-dashboard.vercel.app';

  // debug：保留，方便之後再檢查
  if (url.searchParams.get('debug') === 'true') {
    return new Response(
      `IP: ${ip}\n` +
      `isInternalIP: ${isInternalIP}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  if (isInternalIP) {
    // 辦公室出口 IP：代理到 GAS
    const targetUrl = gasUrl + url.search;
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow',
    });
    const response = await fetch(modifiedRequest);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } else {
    // 其他地點：導到 Vercel
    return Response.redirect(vercelUrl + url.pathname + url.search, 302);
  }
}
