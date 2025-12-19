export async function onRequest(context) {
  const request = context.request;
  const ip = request.headers.get('CF-Connecting-IP') || 'N/A';
  const url = new URL(request.url);

  const regex = /^10\.114\./;  // 先放寬，只要 10.114 開頭就算內網
  const isInternalIP = regex.test(ip);

  // debug 模式：?debug=true 時回傳偵測資訊
  if (url.searchParams.get('debug') === 'true') {
    return new Response(
      `IP: ${ip}\n` +
      `isInternalIP: ${isInternalIP}\n` +
      `regex: ${regex}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  const gasUrl = 'https://script.google.com/a/*/macros/s/AKfycbzSwrTccdwz9bH2CwzUoWAIs51IdmKoHF00c7syhKK9BPaSEamuT1ON_DVXpZlKXy_z/exec';
  const vercelUrl = 'https://fraud-analysis-dashboard.vercel.app';

  if (isInternalIP) {
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
    return Response.redirect(vercelUrl + url.pathname + url.search, 302);
  }
}
