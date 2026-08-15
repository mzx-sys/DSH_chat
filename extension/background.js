/* 鲸鱼邮箱 · 后台服务：转发智能回复请求到 DeepSeek API（绕过页面 CORS） */
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

