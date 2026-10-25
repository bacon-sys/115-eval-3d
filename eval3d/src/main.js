// 進入點：裝置支援 WebGL 時載入 3D 地圖；不支援時直接進入全文閱讀版
const hasGL = (() => {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
})();
if (hasGL && !/[?&]text\b/.test(location.search)) import('./app.js').catch((e) => { console.error('3D 啟動失敗', e); return import('./textonly.js'); }); // 3D 初始化失敗時改用全文閱讀版
else import('./textonly.js');
