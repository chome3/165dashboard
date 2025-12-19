export async function onRequest(context) {
  const request = context.request;
  const ip = request.headers.get('CF-Connecting-IP');
  const url = new URL(request.url);
  
  // 判斷是否為你們警局的內網 IP（10.114.80.0/21）
  const isInternalIP = /^10\.114\.(8[0-7])\.\d{1,3}$/.test(ip);
  
  // 你的 GAS 和 Vercel URL
  const gasUrl = 'https://script.google.com/a/*/macros/s/AKfycbzSwrTccdwz9bH2CwzUoWAIs51IdmKoHF00c7syhKK9BPaSEamuT1ON_DVXpZlKXy_z/exec';
  const vercelUrl = 'https://fraud-analysis-dashboard.vercel.app';
  
  if (isInternalIP) {
    // 內網（10.114.80.x - 10.114.87.x）：代理到 GAS
    const targetUrl = gasUrl + url.search;
    
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    });
    
    const response = await fetch(modifiedRequest);
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    
  } else {
    // 外網：重新導向到 Vercel
    return Response.redirect(vercelUrl + url.pathname + url.search, 302);
  }
}
