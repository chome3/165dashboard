// functions/static/[[path]].js

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

  // 只有內網才代理靜態資源
  if (!isInternalIP) {
    return new Response('Forbidden', { status: 403 });
  }

  // 構建 Google Script 的靜態資源 URL
  const gasBaseUrl = 'https://script.google.com';
  const targetUrl = gasBaseUrl + url.pathname + url.search;

  // 代理請求
  const proxyHeaders = new Headers();
  const allowedHeaders = ['accept', 'accept-encoding', 'accept-language', 'user-agent', 'referer', 'if-none-match', 'if-modified-since'];
  allowedHeaders.forEach(header => {
    const value = request.headers.get(header);
    if (value) proxyHeaders.set(header, value);
  });

  const modifiedRequest = new Request(targetUrl, {
    method: request.method,
    headers: proxyHeaders,
    redirect: 'follow',
  });

  const response = await fetch(modifiedRequest);

  // 複製響應標頭
  const responseHeaders = new Headers(response.headers);
  
  // 添加 CORS 標頭
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', '*');

  // 添加快取標頭（靜態資源可以快取）
  responseHeaders.set('Cache-Control', 'public, max-age=3600');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}