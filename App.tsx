import React, { useState, useEffect } from 'react';

// 定義路由資訊卡的資料結構
interface RouteInfo {
  path: string;
  type: 'Proxy' | 'Redirect' | 'Asset';
  description: string;
  internalDest: string;
  externalDest: string;
}

const App: React.FC = () => {
  const [currentIP, setCurrentIP] = useState<string>('讀取中...');

  useEffect(() => {
    // 嘗試取得使用者 IP (前端模擬)
    fetch('https://www.cloudflare.com/cdn-cgi/trace')
      .then(res => res.text())
      .then(data => {
        const ipLine = data.split('\n').find(l => l.startsWith('ip='));
        if (ipLine) {
          setCurrentIP(ipLine.split('=')[1]);
        }
      })
      .catch(() => setCurrentIP('無法取得 (請檢查 Headers)'));
  }, []);

  const routes: RouteInfo[] = [
    {
      path: "/",
      type: "Proxy",
      description: "根目錄代理端點 (Web Root)。透明轉發內容，網址列不會改變。",
      internalDest: "Google Apps Script (GAS) Exec",
      externalDest: "Vercel Dashboard (Proxy Mode)"
    },
    {
      path: "/dr",
      type: "Redirect",
      description: "直接轉址端點 (Direct Redirect)。回傳 HTTP 302 跳轉至目標。",
      internalDest: "Google Apps Script (GAS) Exec",
      externalDest: "Vercel Dashboard (Direct Link)"
    },
    {
      path: "/static/*",
      type: "Asset",
      description: "處理 GAS HTML 中參照的靜態資源 (JS/CSS)。",
      internalDest: "script.google.com/static/...",
      externalDest: "N/A (禁止存取)"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-indigo-700 mb-2">防詐騙路由轉發系統</h1>
          <p className="text-slate-500">Cloudflare Pages Functions 雙模式路由架構</p>
          <div className="mt-4 inline-block bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
            <span className="text-sm font-semibold text-slate-400 mr-2">您的 IP:</span>
            <span className="text-sm font-mono text-indigo-600">{currentIP}</span>
          </div>
        </header>

        <div className="grid gap-6">
          {routes.map((route) => (
            <div key={route.path} className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-100 hover:shadow-lg transition-shadow duration-300">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-lg font-bold bg-slate-200 px-2 py-1 rounded text-slate-700">{route.path}</span>
                  <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded-full tracking-wide ${
                    route.type === 'Proxy' ? 'bg-blue-100 text-blue-700' :
                    route.type === 'Redirect' ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {route.type}
                  </span>
                </div>
                {route.path !== '/static/*' && (
                  <a 
                    href={`${route.path}?debug=true`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    測試端點 (Debug) &rarr;
                  </a>
                )}
              </div>
              
              <div className="p-6">
                <p className="text-slate-600 mb-6">{route.description}</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                    <h3 className="text-xs font-bold uppercase text-emerald-600 mb-2 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                      內部網路 (Internal)
                    </h3>
                    <p className="font-medium text-sm text-emerald-900 break-words">
                      &rarr; {route.internalDest}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-pink-50 border border-pink-100">
                    <h3 className="text-xs font-bold uppercase text-pink-600 mb-2 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-pink-500 mr-2"></span>
                      外部網路 (External)
                    </h3>
                    <p className="font-medium text-sm text-pink-900 break-words">
                      &rarr; {route.externalDest}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-12 text-center text-xs text-slate-400">
          <p>內部網段白名單 (CIDR): 60.249.9.0/24</p>
          <p className="mt-2">請將此專案部署至 Cloudflare Pages 以啟用伺服器端路由功能。</p>
        </footer>
      </div>
    </div>
  );
};

export default App;