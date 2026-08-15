/* =====================================================================
 * build.js —— 一键生成两个可用的产物（内容源唯一：ds-whale-mailbox.user.js）
 *   1) preview.html      自包含预览页（内嵌脚本，双击即玩，无需安装）
 *   2) extension/        Chrome 扩展（免 Tampermonkey，开发者模式加载即可）
 * 用法：改完脚本后运行  node build.js
 * ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const scriptPath = path.join(ROOT, 'ds-whale-mailbox.user.js');
const script = fs.readFileSync(scriptPath, 'utf8');

/* 后台服务：转发「智能回复」请求到 DeepSeek API（扩展上下文无 CORS 限制） */
const BACKGROUND_JS = `/* 鲸鱼邮箱 · 后台服务：转发智能回复请求到 DeepSeek API（绕过页面 CORS） */
'use strict';
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || msg.type !== 'dsm_chat') return;
  if (!msg.apiKey) { sendResponse({ ok: false, error: '缺少 API Key' }); return; }
  fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + msg.apiKey
    },
    body: JSON.stringify({
      model: msg.model || 'deepseek-chat',
      messages: msg.messages || [],
      max_tokens: 200,
      temperature: 0.9
    })
  })
    .then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, status: r.status, json: j }; });
    })
    .then(function (x) {
      if (x.ok && x.json && x.json.choices && x.json.choices[0] && x.json.choices[0].message) {
        sendResponse({ ok: true, text: x.json.choices[0].message.content });
      } else {
        sendResponse({ ok: false, error: (x.json && x.json.error && x.json.error.message) || ('HTTP ' + x.status) });
      }
    })
    .catch(function (e) { sendResponse({ ok: false, error: String((e && e.message) || e) }); });
  return true; // 异步响应
});
`;

/* ---------- 1) preview.html ---------- */
const safeScript = script.replace(/<\/script>/gi, '<\\/script>');
const previewHtml = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>🐳 鲸鱼邮箱 · 本地预览</title>
<script>
  window.addEventListener('error', function (e) {
    var s = document.getElementById('dsm-status');
    if (s) { s.textContent = '❌ 页面出错：' + (e.message || '未知错误'); s.className = 'err'; }
  });
</script>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;background:#f6f7f9;color:#333;}
  .wrap{max-width:780px;margin:0 auto;padding:48px 20px 80px;}
  .card{background:#fff;border-radius:14px;padding:30px 34px;box-shadow:0 4px 24px rgba(0,0,0,.06);}
  h1{font-size:23px;margin:0 0 6px;}
  .lead{color:#666;line-height:1.8;margin:0 0 14px;}
  ul{line-height:2;color:#444;padding-left:22px;margin:0 0 18px;}
  code{background:#eef1f5;border-radius:4px;padding:1px 6px;font-size:12.5px;color:#c7254e;}
  .hint{background:#fff8e6;border:1px solid #f2d98c;border-radius:10px;padding:12px 16px;font-size:13px;color:#8a6d1a;line-height:1.8;}
  .hint a{color:#a05f00;}
  .status{margin:16px 0 12px;padding:10px 14px;border-radius:10px;font-size:13.5px;font-weight:600;line-height:1.7;}
  .status.loading{background:#eef4ff;color:#2f6bd8;border:1px solid #c8d8f7;}
  .status.ok{background:#e9f9ef;color:#1e7e46;border:1px solid #b7e5c9;}
  .status.err{background:#fdecec;color:#c0392b;border:1px solid #f2b8b8;}
  .openbtn{display:inline-block;border:none;cursor:pointer;background:#2fa84f;color:#fff;font-size:15px;font-weight:600;padding:11px 22px;border-radius:10px;box-shadow:0 3px 12px rgba(47,168,79,.35);}
  .openbtn:hover{filter:brightness(1.08);}
  .openbtn:disabled{background:#b8c0b9;cursor:not-allowed;box-shadow:none;}
  .foot{margin-top:14px;font-size:12px;color:#999;}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <h1>🐳 鲸鱼邮箱 · 本地预览</h1>
    <p class="lead">这个页面内嵌了插件本体（自动进入演示模式），右下角会出现 <b>📧 邮箱图标</b> 和 <b>开关图标</b>。</p>

    <div id="dsm-status" class="status loading">⏳ 正在加载插件…</div>
    <button id="dsm-open" class="openbtn" type="button" disabled>📧 打开鲸鱼邮箱</button>
    <p class="foot">提示：也可以直接点页面右下角的 📧 悬浮图标。</p>

    <ul style="margin-top:20px;">
      <li>页面加载约 1 秒后会自动「收到」一封小鲸娘的邮件——试试看左下角的提示气泡和红色未读角标。</li>
      <li>点 <b>📧</b>：下拉一个微信风格的聊天窗，顶部可切换 <b>🐳 小鲸娘</b>（爱撒娇）或 <b>🐬 小鲸夜</b>（小淘气），有输入框，Enter 发送、Shift+Enter 换行。</li>
      <li>点 <b>🧪</b>：模拟「你给 AI 发消息、正在等待回复」的场景，触发一封随机邮件。</li>
      <li>点 <b>开关</b>：开启 / 关闭整个邮箱功能（关闭后图标变灰、不再收信）。</li>
      <li>聊天记录保存在浏览器本地，刷新页面不会丢。</li>
    </ul>

    <div class="hint">
      💡 正式使用：把 <code>ds-whale-mailbox.user.js</code> 装进 Tampermonkey / Violentmonkey（新建脚本后整体粘贴保存），
      或加载 <code>extension/</code> 文件夹作为 Chrome 扩展，打开 <a href="https://chat.deepseek.com" target="_blank">chat.deepseek.com</a>
      就会自动生效——等你给 AI 发消息、等待回复的间隙，邮箱就会收到海底小伙伴的邮件啦！
    </div>
  </div>
</div>

<script>window.DSM_DEMO = true;</script>
<script>
/*__DSM_SCRIPT__*/
</script>
<script>
(function () {
  var s = document.getElementById('dsm-status');
  var b = document.getElementById('dsm-open');
  var tries = 0;
  // 插件在 DOMContentLoaded 后才初始化，这里轮询等待它起来
  var timer = setInterval(function () {
    if (window.__DSM_MAILBOX__) {
      clearInterval(timer);
      var on = window.__DSM_MAILBOX__.state && window.__DSM_MAILBOX__.state.enabled;
      if (on) {
        s.textContent = '✅ 插件已加载 v' + window.__DSM_MAILBOX__.version + ' —— 约 1 秒后会自动收到一封邮件，看右下角 📧 角标';
        s.className = 'ok';
      } else {
        s.textContent = '✅ 插件已加载，但邮箱功能当前是关闭的——点右下角 🔘 开关重新开启';
        s.className = 'ok';
      }
      b.disabled = false;
    } else if (++tries > 40) {
      clearInterval(timer);
      s.textContent = '❌ 插件未能加载（按 F12 打开控制台查看报错）';
      s.className = 'err';
    }
  }, 100);
  b.addEventListener('click', function () {
    if (window.__DSM_MAILBOX__) window.__DSM_MAILBOX__.openPanel();
  });
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'preview.html'), previewHtml.replace('/*__DSM_SCRIPT__*/', function () { return safeScript; }), 'utf8');
console.log('✅ preview.html 已生成');

/* ---------- 2) Chrome 扩展 ---------- */
const extDir = path.join(ROOT, 'extension');
fs.mkdirSync(extDir, { recursive: true });

const manifest = {
  manifest_version: 3,
  name: '鲸鱼邮箱 · DeepSeek 聊天小助手',
  version: '0.1.0',
  description: '在 DeepSeek 等待 AI 回复时收到鲸鱼小伙伴发来的邮件，点开邮箱即可像微信一样聊天（小鲸娘/小鲸夜，可选智能回复）',
  author: 'mzx-sys',
  homepage_url: 'https://github.com/mzx-sys/DSH_chat',
  icons: { 16: 'icon16.png', 32: 'icon32.png', 48: 'icon48.png', 128: 'icon128.png' },
  background: { service_worker: 'background.js' },
  content_scripts: [
    {
      matches: [
        'https://chat.deepseek.com/*',
        'https://www.deepseek.com/*',
        'http://127.0.0.1/*',
        'http://localhost/*'
      ],
      js: ['content.js'],
      run_at: 'document_idle'
    }
  ],
  host_permissions: [
    'https://chat.deepseek.com/*',
    'https://www.deepseek.com/*',
    'http://127.0.0.1/*',
    'http://localhost/*',
    'https://api.deepseek.com/*'
  ]
};
fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(extDir, 'content.js'), script + '\n', 'utf8');
fs.writeFileSync(path.join(extDir, 'background.js'), BACKGROUND_JS + '\n', 'utf8');
console.log('✅ extension/ 已生成（manifest.json + content.js + background.js）');
console.log('完成：node build.js 之后，两个产物都是最新状态');
