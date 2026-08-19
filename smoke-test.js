/* 冒烟测试：用 DOM 桩加载油猴脚本，验证初始化与邮件投递逻辑 */
'use strict';
const path = require('path');

class FakeEl {
  constructor(tag) {
    this.tag = tag; this.children = []; this.style = {}; this.dataset = {};
    this._cls = new Set(); this.listeners = {}; this.value = ''; this.rows = 1;
    this.placeholder = ''; this.title = ''; this.scrollTop = 0; this.scrollHeight = 0;
    this._text = ''; this._html = '';
  }
  set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return Array.from(this._cls).join(' '); }
  get classList() {
    const s = this._cls;
    return {
      add: (...c) => c.forEach(x => s.add(x)),
      remove: (...c) => c.forEach(x => s.delete(x)),
      toggle: (c, f) => { const on = f === undefined ? !s.has(c) : !!f; on ? s.add(c) : s.delete(c); return on; },
      contains: (c) => s.has(c)
    };
  }
  appendChild(n) { this.children.push(n); return n; }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text; }
  set innerHTML(v) { this._html = String(v); this.children = []; }
  get innerHTML() { return this._html; }
  querySelector() { return new FakeEl('div'); }
  querySelectorAll() { return []; }
  closest() { return null; }
  matches() { return false; }
  addEventListener() {}
  getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
  setPointerCapture() {}
  contains() { return false; }
}

const body = new FakeEl('body');
const head = new FakeEl('head');
const documentElement = new FakeEl('html');

global.document = new FakeEl('document');
global.document.body = body;
global.document.head = head;
global.document.documentElement = documentElement;
global.document.readyState = 'complete';
global.document.addEventListener = function () {};
global.document.createElement = (tag) => new FakeEl(tag);
global.document.createTextNode = (txt) => ({ nodeType: 3, textContent: String(txt) });

global.window = {
  innerHeight: 800,
  innerWidth: 1200,
  matchMedia: () => ({ matches: false }),
  addEventListener: function () {},
  DSM_DEMO: undefined,
  __DSM_MAILBOX__: undefined
};
global.location = { search: '', href: 'https://chat.deepseek.com/' };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.MutationObserver = class { constructor(cb) { this.cb = cb; } observe() {} disconnect() {} };

require(path.join(__dirname, 'ds-whale-mailbox.user.js'));

const mb = global.window.__DSM_MAILBOX__;
const assert = (cond, name) => {
  if (!cond) { console.error('❌ FAIL: ' + name); process.exitCode = 1; }
  else console.log('✅ ' + name);
};

assert(mb && mb.version === '0.1.0', '脚本加载并暴露钩子');
assert(mb.characters.sister && mb.characters.brother, '两个角色已注册');
assert(mb.state.convos.sister.messages.length === 1, '小鲸娘有开场白');
assert(mb.state.convos.sister.unread === 1, '开场白未读=1');

mb.deliverEmail('sister', '测试邮件A');
assert(mb.state.convos.sister.messages.length === 2, '收到邮件后消息+1');
assert(mb.state.convos.sister.unread === 2, '未读+1');

mb.deliverEmail('brother', '测试邮件B');
const total = mb.state.convos.sister.unread + mb.state.convos.brother.unread;
assert(total === 4, '总未读=4（开场白1+1 + 两封新邮件，实际' + total + '）');

mb.scheduleEmail('为什么天空是蓝色的？');
assert(mb.state.convos.sister.messages.length >= 2, 'scheduleEmail 不崩溃');

// 检查回复池完整性：每个角色每个意图都有话术，且含 fallback
['sister', 'brother'].forEach(id => {
  const ch = mb.characters[id];
  const intents = ['greeting','bye','thanks','name','love','sad','happy','joke','play','hungry','study','time','question','fallback'];
  intents.forEach(iv => {
    assert(Array.isArray(ch.replies[iv]) && ch.replies[iv].length > 0, id + ' 意图回复池: ' + iv);
  });
  ['waiting','question','code','study','emotion','generic'].forEach(ev => {
    assert(Array.isArray(ch.emails[ev]) && ch.emails[ev].length > 0, id + ' 邮件池: ' + ev);
  });
});

// 邮箱图标、开关、面板已构建
assert(body.children.length === 1 && body.children[0].id === 'dsm-root', 'UI 已挂载到 body');

// 打开面板 + 面板内收信 + 切角色（覆盖 renderChat / positionPanel / renderContacts）
mb.openPanel();
mb.deliverEmail('sister', '面板打开时发给当前角色的邮件');
assert(mb.state.convos.sister.messages.length >= 3, '面板内收信不崩溃');
assert(mb.state.convos.sister.unread === 0, '面板打开时发给当前可见角色不累计未读');
mb.deliverEmail('brother', '发给非当前角色的邮件');
assert(mb.state.convos.brother.unread >= 3, '发给非当前角色照常计未读');

// 自定义角色：新增 → 出现在列表 → 会话可用
const turtle = mb.addCustomChar('海龟哥哥', '🐢', '你是海龟哥哥，稳重话不多，喜欢讲海底老故事', '小兄弟，别急，慢慢来。');
assert(!!turtle && !!turtle.id, '自定义角色创建成功');
assert(mb.getChars().length === 3, '角色列表含自定义角色（3个）');
assert(!!mb.getChar(turtle.id), 'getChar 能查到自定义角色');
assert(!!mb.state.convos[turtle.id], '自定义角色有独立会话');
assert(mb.charPrompt(turtle.id).indexOf('海龟哥哥') !== -1, '自定义角色提示词生效');
assert(turtle.fallback === '小兄弟，别急，慢慢来。', '自定义角色兜底话术已保存');
assert(mb.generateReply(turtle.id, '你好') === '小兄弟，别急，慢慢来。', '无智能回复时用兜底话术回复');
mb.deliverEmail(turtle.id, '来自海龟哥哥的消息');
assert(mb.state.convos[turtle.id].messages.length >= 2, '自定义角色可收消息');

// 多轮上下文：对话历史应包含最近消息，且当前消息不重复
mb.state.convos.sister.messages.push({ id: 'x1', from: 'char', charId: 'sister', text: '上一条鲸鱼说的话', time: Date.now() });
mb.state.convos.sister.messages.push({ id: 'x2', from: 'user', charId: 'sister', text: '你记得上一条吗', time: Date.now() });
const msgs = mb.buildSmartMessages('sister', '你记得上一条吗');
const hasHistory = msgs.some(function (m) { return m.role === 'assistant' && m.content === '上一条鲸鱼说的话'; });
assert(hasHistory, '多轮上下文包含历史对话');
assert(msgs[msgs.length - 1].content === '你记得上一条吗', '多轮上下文最后一条是当前消息');
const dup = msgs.filter(function (m) { return m.role === 'user' && m.content === '你记得上一条吗'; }).length;
assert(dup === 1, '当前消息不重复');
console.log('冒烟测试完成');
