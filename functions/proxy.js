// functions/proxy.js

function ipToInt(ip) {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function isInCidr(ip, cidr) {
  const [range, bits = '32'] = cidr.split('/');
  const mask = bits === '0' ? 0 : (~0 << (32 - Number(bits))) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(range) & mask);
}

export async function onRequest(context) {
  const request = context.request;
  const ip = request.headers.get('CF-Connecting-IP') || 'N/A';
  const url = new URL(request.url);

  const cidrs = [
    '60.249.9.0/24',
    // '60.249.10.0/24',
  ];
  const isInternalIP = cidrs.some(cidr => isInCidr(ip, cidr));

  const gasUrl = 'https://script.google.com/a/*/macros/s/AKfycbzSwrTccdwz9bH2CwzUoWAIs51IdmKoHF00c7syhKK9BPaSEamuT1ON_DVXpZlKXy_z/exec';
  const vercelUrl = 'https://fraud-analysis-dashboard.vercel.app';

  // debug：/proxy?debug=true
  if (url.searchParams.get('debug-headers') === 'true' && isInternalIP) {
  const targetUrl = gasUrl + url.search.replace('debug-headers=true', '');
  const response = await fetch(targetUrl);
  const body = await response.text();
  
  return new Response(
    `Status: ${response.status}\n\n` +
    `Headers:\n${Array.from(response.headers.entries()).map(([k,v]) => `${k}: ${v}`).join('\n')}\n\n` +
    `Body length: ${body.length}\n\n` +
    `Body preview:\n${body.substring(0, 500)}`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
}
  if (isInternalIP) {
    // 內網 → 代理到 GAS
    const targetUrl = gasUrl + url.search;
    
    // 建立新的請求標頭，移除可能造成問題的標頭
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.delete('host');
    proxyHeaders.delete('cf-connecting-ip');
    proxyHeaders.delete('cf-ray');
    
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });
    
    const response = await fetch(modifiedRequest);
    
    // 讀取完整的響應內容
    const responseBody = await response.text();
    
    // 建立新的響應標頭
    const responseHeaders = new Headers(response.headers);
    
    // 確保正確的 Content-Type
    if (!responseHeaders.has('Content-Type')) {
      responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
    }
    
    // 移除可能阻止顯示的標頭
    responseHeaders.delete('X-Frame-Options');
    responseHeaders.delete('Content-Security-Policy');
    
    // 添加 CORS 標頭（如果需要）
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } else {
    // 外網 → 代理到 Vercel
    const targetUrl = vercelUrl + url.pathname.replace('/proxy', '') + url.search;
    
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.delete('host');
    
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });
    
    const response = await fetch(modifiedRequest);
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
}
