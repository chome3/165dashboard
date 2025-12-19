<<<<<<< HEAD
// functions/index.js

function ipToInt(ip) {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function isInCidr(ip, cidr) {
  const [range, bits = '32'] = cidr.split('/');
  const mask = bits === '0' ? 0 : (~0 << (32 - Number(bits))) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(range) & mask);
}

=======
>>>>>>> 88d1ea6366799202ae1b6d1a00b18873c270debd
export async function onRequest(context) {
  const request = context.request;
  const ip = request.headers.get('CF-Connecting-IP') || 'N/A';
  const url = new URL(request.url);

<<<<<<< HEAD
  // ===== 出口網段：請按實際情況修改 =====
  const cidrs = [
    '60.249.9.0/24',   // 例：60.249.9.x
    // '60.249.10.0/24',
  ];
  const isInternalIP = cidrs.some(cidr => isInCidr(ip, cidr));
  // ====================================
=======
  const isInternalIP = ip === '60.249.9.184';
>>>>>>> 88d1ea6366799202ae1b6d1a00b18873c270debd

  const gasUrl = 'https://script.google.com/a/*/macros/s/AKfycbzSwrTccdwz9bH2CwzUoWAIs51IdmKoHF00c7syhKK9BPaSEamuT1ON_DVXpZlKXy_z/exec';
  const vercelUrl = 'https://fraud-analysis-dashboard.vercel.app';

<<<<<<< HEAD
  // debug：?debug=true
  if (url.searchParams.get('debug') === 'true') {
    return new Response(
      `IP: ${ip}\n` +
      `isInternalIP: ${isInternalIP}\n` +
      `CIDRs: ${cidrs.join(', ')}`,
=======
  if (url.searchParams.get('debug') === 'true') {
    return new Response(
      `IP: ${ip}\n` +
      `isInternalIP: ${isInternalIP}`,
>>>>>>> 88d1ea6366799202ae1b6d1a00b18873c270debd
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  if (isInternalIP) {
<<<<<<< HEAD
    // 內網 → 直接 302 轉向 GAS（不代理）
    return Response.redirect(gasUrl + url.search, 302);
  } else {
    // 外網 → 轉向 Vercel
=======
    // 直接 302 轉向到 GAS（瀏覽器網址會變成 GAS）
    return Response.redirect(gasUrl + url.search, 302);
  } else {
    // 外網照舊走 Vercel
>>>>>>> 88d1ea6366799202ae1b6d1a00b18873c270debd
    return Response.redirect(vercelUrl + url.pathname + url.search, 302);
  }
}
