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

  const cidrs = ['60.249.9.0/24'];
  const isInternalIP = cidrs.some(cidr => isInCidr(ip, cidr));

  const gasUrl = 'https://script.google.com/a/*/macros/s/AKfycbzSwrTccdwz9bH2CwzUoWAIs51IdmKoHF00c7syhKK9BPaSEamuT1ON_DVXpZlKXy_z/exec';
  const vercelUrl = 'https://fraud-analysis-dashboard.vercel.app';

  if (url.searchParams.get('debug') === 'true') {
    return new Response(
      `IP: ${ip}\nisInternalIP: ${isInternalIP}\nCIDRs: ${cidrs.join(', ')}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  if (isInternalIP) {
    const targetUrl = gasUrl + url.search;
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow',
    });
    
    const response = await fetch(modifiedRequest);
    
    // 建立新的 headers，移除會干擾的 headers
    const newHeaders = new Headers(response.headers);
    newHeaders.delete('X-Frame-Options');
    newHeaders.delete('Content-Security-Policy');
    newHeaders.delete('X-Content-Type-Options');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } else {
    return Response.redirect(vercelUrl + url.pathname.replace('/proxy', '') + url.search, 302);
  }
}
