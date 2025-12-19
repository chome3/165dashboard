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

  // 只有內網才代理子資源
  if (!isInternalIP) {
    return new Response('Forbidden', { status: 403 });
  }

  // 只代理 GAS 相關的路徑（避免攔截到其他不相關的路徑）
  const gasResourcePaths = [
    '/static/',
    '/userCodeAppPanel',
    '/wardeninit',
    '/jserror',
    '/a/macros/',
    '/macros/'
  ];

  const isGasResource = gasResourcePaths.some(prefix => url.pathname.startsWith(prefix));

  if (!isGasResource) {
    // 不是 GAS 資源，返回 404
    return new Response('Not Found', { status: 404 });
  }

  // 構建 Google Script 的完整 URL
  const gasBaseUrl = 'https://script.google.com';
  const targetUrl = gasBaseUrl + url.pathname + url.search;

  const proxyHeaders = new Headers();
  [
    'accept',
    'accept-encoding',
    'accept-language',
    'user-agent',
    'referer',
    'if-none-match',
    'if-modified-since',
    'cookie'
  ].forEach(header => {
    const value = request.headers.get(header);
    if (value) proxyHeaders.set(header, value);
  });

  const modifiedRequest = new Request(targetUrl, {
    method: request.method,
    headers: proxyHeaders,
    redirect: 'follow',
  });

  const response = await fetch(modifiedRequest);

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('X-Frame-Options');
  responseHeaders.delete('Content-Security-Policy');
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
