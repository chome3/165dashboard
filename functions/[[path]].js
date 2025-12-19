// functions/[[path]].js

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

  const cidrs = ['60.249.9.0/24'];
  const isInternalIP = cidrs.some(cidr => isInCidr(ip, cidr));

  // 只有內網才代理
  if (!isInternalIP) {
    return new Response('Forbidden', { status: 403 });
  }

  // 構建完整的 GAS URL
  const gasBaseUrl = 'https://script.google.com';
  const targetUrl = gasBaseUrl + url.pathname + url.search;

  // 複製請求 headers
  const proxyHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    // 排除 Cloudflare 專屬的 headers
    if (!key.startsWith('cf-') && key !== 'host') {
      proxyHeaders.set(key, value);
    }
  }

  try {
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });

    const response = await fetch(modifiedRequest);

    // 複製回應 headers
    const responseHeaders = new Headers(response.headers);
    
    // 移除可能干擾的 headers
    responseHeaders.delete('X-Frame-Options');
    responseHeaders.delete('Content-Security-Policy');
    responseHeaders.delete('X-Content-Type-Options');
    
    // 添加 CORS
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { 
      status: 502,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
