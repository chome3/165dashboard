// functions/index.js

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

  // debug: /?debug=true
  if (url.searchParams.get('debug') === 'true') {
    return new Response(
      `IP: ${ip}\n` +
      `isInternalIP: ${isInternalIP}\n` +
      `CIDRs: ${cidrs.join(', ')}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // debug-headers: /?debug-headers=true
  if (url.searchParams.get('debug-headers') === 'true' && isInternalIP) {
    const targetUrl = gasUrl + url.search.replace('&debug-headers=true', '').replace('?debug-headers=true', '');
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
    // Internal network -> Proxy to GAS
    const targetUrl = gasUrl + url.search;
    
    // Build clean request headers
    const proxyHeaders = new Headers();
    const allowedHeaders = ['accept', 'accept-language', 'user-agent', 'referer'];
    allowedHeaders.forEach(header => {
      const value = request.headers.get(header);
      if (value) proxyHeaders.set(header, value);
    });
    
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });
    
    const response = await fetch(modifiedRequest);
    const responseBody = await response.text();
    
    // Get GAS base URL for fixing relative paths
    const gasBaseUrl = 'https://script.google.com';
    
    // Fix relative paths in HTML
    const fixedBody = responseBody
      .replace(/src="\/static\//g, `src="${gasBaseUrl}/static/`)
      .replace(/href="\/static\//g, `href="${gasBaseUrl}/static/`)
      .replace(/src='\/static\//g, `src='${gasBaseUrl}/static/`)
      .replace(/href='\/static\//g, `href='${gasBaseUrl}/static/`);
    
    // Build new response headers
    const responseHeaders = new Headers();
    
    // Copy necessary headers
    const importantHeaders = ['content-type', 'cache-control', 'expires'];
    importantHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) responseHeaders.set(header, value);
    });
    
    // Ensure correct Content-Type
    if (!responseHeaders.has('content-type')) {
      responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
    }
    
    // Add CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    
    return new Response(fixedBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } else {
    // External network -> Proxy to Vercel
    const targetUrl = vercelUrl + url.pathname + url.search;
    
    const proxyHeaders = new Headers();
    const allowedHeaders = ['accept', 'accept-language', 'content-type', 'user-agent'];
    allowedHeaders.forEach(header => {
      const value = request.headers.get(header);
      if (value) proxyHeaders.set(header, value);
    });
    
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });
    
    const response = await fetch(modifiedRequest);
    
    // For Vercel response, keep as is
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
}