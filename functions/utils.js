// functions/utils.js

/**
 * 將 IP 字串轉換為整數進行比較
 * @param {string} ip 
 * @returns {number}
 */
export function ipToInt(ip) {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

/**
 * 檢查 IP 是否在 CIDR 範圍內
 * @param {string} ip 
 * @param {string} cidr 
 * @returns {boolean}
 */
export function isInCidr(ip, cidr) {
  const [range, bits = '32'] = cidr.split('/');
  const mask = bits === '0' ? 0 : (~0 << (32 - Number(bits))) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(range) & mask);
}

// 內部網路白名單 (CIDR 格式)
// 更新：加入 60.249.21.0/24 與 203.69.10.0/24 網段
export const INTERNAL_CIDRS = [
  '60.249.9.0/24',
  '60.249.21.0/24',
  '203.69.10.0/24'
];

// 系統配置
export const CONFIG = {
  // 內部: Google Apps Script (GAS) 執行網址
  GAS_URL: 'https://script.google.com/a/macros/s/AKfycbzSwrTccdwz9bH2CwzUoWAIs51IdmKoHF00c7syhKK9BPaSEamuT1ON_DVXpZlKXy_z/exec',
  
  // GAS 基礎網址 (用於靜態資源重寫)
  GAS_BASE: 'https://script.google.com',
  
  // 外部: Vercel Dashboard 網址
  VERCEL_URL: 'https://fraud-analysis-dashboard.vercel.app'
};