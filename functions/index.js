export async function onRequest(context) {
  const request = context.request;
  const ip = request.headers.get('CF-Connecting-IP');
  const url = new URL(request.url);
  
  // 判斷是否為內網 IP
  const isInternalIP = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(ip);
  
  // 你的 GAS 和 Vercel URL（請替換成實際網址）
  const gasUrl = 'https://script.google.com/a/*/macros/s/AKfycbzSwrTccdwz9bH2CwzUoWAIs51IdmKoHF00c7syhKK9BPaSEamuT1ON_DVXpZlKXy_z/exec';
  const vercelUrl = 'https://fraud-analysis-dashboard.vercel.app/';
  
  if (isInternalIP) {
    // 內網：代理到 GAS
    const targetUrl = gasUrl + url.search; // 保留查詢參數
    
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
