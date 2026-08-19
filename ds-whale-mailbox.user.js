// ==UserScript==
// @name         鲸鱼邮箱 · DeepSeek 聊天小助手
// @namespace    local.whale-mailbox
// @version      0.1.0
// @description  在 DeepSeek 等待 AI 回复时，邮箱会收到来自海底小伙伴的邮件；点开邮箱即可像微信一样聊天，可选爱撒娇的小鲸娘或小淘气小鲸夜
// @author       you
// @match        https://chat.deepseek.com/*
// @match        https://www.deepseek.com/*
// @match        http://127.0.0.1/*
// @match        http://localhost/*
// @run-at       document-idle
// @grant        none
// @noframes
// @license      MIT
// ==/UserScript==

/* =====================================================================
 * 鲸鱼邮箱（Whale Mailbox）
 * ---------------------------------------------------------------------
 * 功能：
 *  1. DeepSeek 页面右下侧悬浮两个图标：📧 邮箱 / 开关（控制整个邮箱功能）
 *  2. 你给 AI 发消息、等待回复的这段时间里，小鲸娘/弟弟会“发邮件”
 *     过来陪聊（左下角弹小提示，图标上出现未读小红点）
 *  3. 点 📧 下拉一个微信风格的聊天窗（尽量不遮挡工作区）：
 *     - 上方两个联系人卡片：🐳 小鲸娘（爱撒娇）、🐬 小鲸夜（小淘气）
 *     - 中间聊天气泡（你右边绿色、鲸鱼左边灰色，带时间、日期分隔线）
 *     - 底部输入框 + 发送（Enter 发送 / Shift+Enter 换行）
 *  4. 对话性格 = 角色选择，回复由本地模板引擎按关键词 + 随机生成
 *  5. 状态全部存 localStorage，刷新页面后继续上次的聊天记录
 * ---------------------------------------------------------------------
 * 预览：用浏览器打开同目录 preview.html 即可在不装插件的情况下试玩。
 * 扩展：想加新角色，往 CHARACTERS 里加一份配置即可（见文件底部说明）。
 * ===================================================================== */

(function () {
  'use strict';

  /* ============================ 小工具 ============================ */
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  const uid = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function fmtTime(d) {
    const p = (n) => String(n).padStart(2, '0');
    return p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function fmtDate(d) {
    const p = (n) => String(n).padStart(2, '0');
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + fmtTime(d);
  }
  function isDemo() {
    try {
      return window.DSM_DEMO === true || /[?&]dsm_demo=1/.test(location.search);
    } catch (e) { return false; }
  }
  function isDeepSeekHost() {
    try {
      const h = location.hostname || '';
      return h === 'chat.deepseek.com' || h === 'www.deepseek.com' || h.indexOf('.deepseek.com') !== -1;
    } catch (e) { return false; }
  }

  /* ============================ 配置 ============================ */
  const CONFIG = {
    version: '0.1.0',
    lsKey: 'dsm_whale_mailbox_v1',
    emailDelayMin: 1500,   // 发出消息后多久“收到”邮件（毫秒）
    emailDelayMax: 4200,
    emailCooldown: 8000,   // 两次邮件的最短间隔，防止刷屏
    maxMessages: 200,      // 每个角色的聊天记录上限
    toastDuration: 3600
  };

  /* ============================ 角色与话术 ============================ */
  /* 小鲸娘头像：由 touxiang.jpg 压缩后内嵌（data URI），替换占位符即可换图 */
  const AVATARS = { sister: 'data:image/jpeg;base64,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' };

  const CHARACTERS = {
    sister: {
      id: 'sister',
      name: '小鲸娘',
      emoji: '🐳',
      color: '#ff8fb8',
      gradient: 'linear-gradient(135deg,#ffb3d1,#ff6fa5)',
      avatar: AVATARS.sister,
      tagline: '爱撒娇的小女孩',
      hint: '哄哄她，她最吃这套啦~',
      systemPrompt: '你是「小鲸娘」，一只爱撒娇的小鲸鱼，是用户的好朋友。说话用撒娇、可爱的语气，多用波浪号～和颜文字（如(｡•́︿•̀｡)、(*^▽^*)、(っ´ω`)ﾉ），称呼用户为「哥哥」。回复要简短（不超过60字）、口语化、有感情，像微信聊天一样，可以适当用 emoji。',
      intro: '呜哇~哥哥终于来找小鲸娘玩啦！人家等你好久好久了(｡•́︿•̀｡)',
      replies: {
        greeting: [
          '哥哥好呀~小鲸娘今天也超想你的(*^▽^*)',
          '嘿嘿，你一找我说话，小鲸娘的尾巴就摇起来啦~',
          '哥哥来啦！快抱抱小鲸娘嘛(っ´ω`)ﾉ'
        ],
        bye: [
          '哥哥要走了嘛…那、那小鲸娘会乖乖等你的，呜，要早点回来哦(´;ω;｀)',
          '拜拜哥哥~记得想我！不想我的话，小鲸娘就哭给你看！哼！',
          '哥哥再见！小鲸娘送你一朵小浪花🌊 要平安哦~'
        ],
        thanks: [
          '嘿嘿，不用谢啦~能帮到哥哥，小鲸娘最开心啦(*≧▽≦)',
          '哥哥客气什么嘛，小鲸娘可是最疼哥哥的！',
          '唔…被哥哥夸得都不好意思啦(〃ω〃)'
        ],
        howareyou: [
          '小鲸娘很好呀~就是有点想哥哥了(｡•́︿•̀｡)',
          '吃饱饱睡好好，超级有精神！哥哥呢哥哥呢？',
          '刚刚在海底追小鱼玩呢~听到哥哥叫我，马上游上来啦！'
        ],
        name: [
          '我是小鲸娘呀！全海底最可爱的鲸鱼！哥哥居然忘记人家了，呜哇——',
          '小鲸娘呀！你要记住哦，下次再忘，我就拿尾巴拍你！哼(｀へ´)'
        ],
        love: [
          '呜哇！哥哥说喜欢我！小鲸娘开心得冒泡泡啦~咕噜咕噜(*/ω＼*)',
          '那当然啦，我可是最喜欢哥哥的小鲸娘！谁都比不上！',
          '哥哥最好了！小鲸娘要做哥哥的小跟屁虫，甩都甩不掉！'
        ],
        sad: [
          '哥哥别难过嘛…小鲸娘给你一个大大的拥抱(っ´ω`)ﾉ 有什么委屈都可以说给我听哦',
          '呜…看到哥哥不开心，小鲸娘也不开心了。来，我陪你坐一会儿~',
          '哥哥辛苦啦！小鲸娘帮你把坏心情都吹到海面上，让太阳晒跑它！☀️'
        ],
        happy: [
          '嘿嘿，哥哥开心我就开心！要不要一起去冲浪呀~🌊',
          '太好啦！哥哥笑起来最好看了！小鲸娘陪着你一起笑，哈哈哈~'
        ],
        joke: [
          '从前有只小鲸鱼，它问妈妈：妈妈妈妈，我什么时候才能喷水呀？妈妈说：等你学会憋气……哥哥听懂了吗？嘿嘿，其实我也没懂啦(≧▽≦)',
          '哥哥想听笑话呀？小鲸娘只会撒娇不会讲笑话啦~要不我给你吐个泡泡圈圈玩？🫧'
        ],
        play: [
          '好呀好呀！哥哥陪我玩！我们来玩石头剪刀布——我先出，我出布！嘿嘿，耍赖啦~',
          '玩什么玩什么？捉迷藏吗？我躲海底，哥哥肯定找不到，嘻嘻~'
        ],
        hungry: [
          '小鲸娘饿了…想吃哥哥投喂的小鱼干(๑´ㅂ`๑) 开玩笑的啦，哥哥去吃好吃的吧，记得给我带一份！',
          '啊？哥哥还没吃饭呀！快去吃饭快去吃饭，饿着肚子怎么行，小鲸娘心疼！'
        ],
        study: [
          '哥哥认真学习的样子最帅啦！小鲸娘在旁边给你打气！(ง •̀_•́)ง',
          '哥哥加油！小鲸娘帮你把书页都翻好了，就等你啦！'
        ],
        time: [
          '现在几点啦？小鲸娘用的是海洋时间哦~不过看太阳的位置，应该是你那边…我也不知道啦，嘿嘿',
          '唔…小鲸娘看的是水母钟，不太准。哥哥手机就在手里，怎么还问我呀~(≧▽≦)'
        ],
        question: [
          '哥哥的问题好难哦，小鲸娘的小脑瓜都要冒烟啦(>﹏<)',
          '唔…这个问题嘛，小鲸娘觉得……哥哥说的都对！嘿嘿~'
        ],
        fallback: [
          '哥哥说的我都有认真听哦~虽然听不太懂，但哥哥最厉害啦！',
          '呜嗯…小鲸娘有点跟不上哥哥的思路啦，不过没关系，我会一直陪着你的~',
          '哥哥再说一遍好不好？小鲸娘想听哥哥说话的声音~',
          '嘿嘿，其实小鲸娘没听懂，但我觉得哥哥说得对！(*≧▽≦)'
        ]
      },
      emails: {
        waiting: [
          '哥哥在等 AI 回话呀？小鲸娘陪你一起等~它好慢哦，我都帮你数了三遍泡泡了🫧',
          'AI 怎么还不回呀~哥哥你别急，小鲸娘给你讲个海底的小秘密，它肯定马上就好啦！',
          '哥哥哥哥，等 AI 的时候陪我聊聊天嘛~人家一个人好无聊的说~'
        ],
        question: [
          '哥哥你在问好难的问题哦~小鲸娘偷偷看了一眼，头晕眼花啦(⊙o⊙) 哥哥好厉害！',
          '这个问题听起来好深奥，小鲸娘帮不上忙，只能给你吐个爱心泡泡💗 加油！'
        ],
        code: [
          '代码代码，全是代码！小鲸娘看到代码就犯困啦~哥哥写慢一点嘛，等等我呀',
          '哥哥又在写程序呀！小心 bug 哦，我听说它们最喜欢趁哥哥不注意偷偷溜进来呢！'
        ],
        study: [
          '哥哥认真学习的样子最帅啦！小鲸娘在旁边给你打气！(ง •̀_•́)ง',
          '学习学习！哥哥记得学累了要休息哦，小鲸娘可不想看你变成小熊猫🐼'
        ],
        emotion: [
          '听哥哥说这些，小鲸娘好心疼呀…来，抱抱(っ´ω`)ﾉ 有什么不开心的都说完，再跟我说一遍，我帮你记着！',
          '哥哥辛苦了！小鲸娘帮你把烦恼都装进贝壳里，丢到深深的海底去~'
        ],
        generic: [
          '哥哥在和 AI 聊天呀？小鲸娘就静静看着你，不说话，嘿嘿(〃ω〃)',
          '收到一封来自海底的问候~小鲸娘祝你今天也开开心心的！🌊',
          '哥哥聊完记得看看我哦，小鲸娘给你留了小礼物~（其实是浪花一朵）'
        ]
      }
    },

    brother: {
      id: 'brother',
      name: '小鲸夜',
      emoji: '🐬',
      color: '#63b3ed',
      gradient: 'linear-gradient(135deg,#7dd3fc,#4f8ef7)',
      tagline: '小淘气',
      hint: '别跟他一般见识，他就是嘴欠~',
      systemPrompt: '你是「小鲸夜」，一只淘气爱捣蛋的小鲸鱼，是用户的好朋友。性格活泼、爱开玩笑、喜欢抬杠和吐槽，但很讲义气。说话调皮、轻松，可以稍微损用户但别过分，称呼随意（「你」「兄弟」都行）。回复要简短（不超过60字）、口语化，像微信聊天一样，可以适当用 emoji。',
      intro: '哟！你怎么来了？说吧，找我干嘛？是不是又被 AI 气到了？嘿嘿。',
      replies: {
        greeting: [
          '哟，稀客呀！说吧，找我干嘛？是不是又被 AI 气到了？嘿嘿。',
          '嘿！来陪我玩？先说好，我可不会让着你。',
          '哟哟哟，这不是我哥/我姐嘛！怎么，想起我这个小机灵鬼啦？'
        ],
        bye: [
          '走啦？行吧行吧，我继续去海底捣蛋去了。记得回来给我带好吃的！',
          '拜拜！放心，我不会在你背后搞破坏的……大概吧。嘿嘿。'
        ],
        thanks: [
          '小事儿！我小鲸夜可是海底最讲义气的鲸鱼，虽然我平时爱捣蛋。',
          '谢啥呀，见外了不是？下次有好玩的记得叫上我！'
        ],
        howareyou: [
          '好得很！刚把一只螃蟹吓得横着跑，笑死我了。你呢？',
          '能吃能睡能捣蛋，日子美滋滋。你过得咋样？没被 AI 绕晕吧？'
        ],
        name: [
          '我是谁？我是你人见人爱花见花开、海底第一捣蛋鬼——小鲸夜！记住了没？',
          '小鲸夜呀！记性这么差，小心我把你的备注改成“笨蛋”哦！'
        ],
        love: [
          '啧啧啧，突然这么肉麻，你是不是想让我帮忙干啥坏事？说吧！',
          '喜欢我？那可不，我这么可爱（自认为），不过你可别告诉小鲸娘，她会吃醋的。'
        ],
        sad: [
          '咋了？谁惹你了？告诉我，我帮你……帮你画个鲸鱼嘲笑他！嘿嘿，开玩笑的，我认真帮你骂他！',
          '别丧气嘛，天塌下来有我顶着——反正我皮厚。走，我带你去海底飙车（骑海马）！'
        ],
        happy: [
          '看你这么开心，我也开心！走，庆祝一下，我们去吓唬吓唬海龟！',
          '开心就好！不过我总觉得你特别开心的时候容易被骗，要小心点哦。'
        ],
        joke: [
          '为什么鲸鱼不能玩扑克牌？因为海底总有人出老千！哈哈哈不好笑吗？好吧我知道很冷。',
          '你让我讲笑话？行：你让我讲笑话。……哈哈哈哈哈！诶你怎么不笑？'
        ],
        play: [
          '玩什么？捉迷藏？我藏起来你绝对找不到，因为我会隐身术——其实是躲你背后。',
          '来呀来呀！我们比赛吐泡泡，输的人请吃小鱼干！我肯定赢，我可是专业吐泡泡的。'
        ],
        hungry: [
          '饿啦？海底餐厅新出了海带汉堡，听说吃了能长出八条腿……骗你的，我才不信呢。',
          '我也饿了，正好，我们比赛谁先找到吃的，输的人给对方洗尾巴！'
        ],
        study: [
          '学习？你居然在认真学习！太阳打西边出来了，我得去叫小鲸娘来看！',
          '加油加油！等你学完，我请你吃海底烧烤——虽然海底不能生火，嘿嘿。'
        ],
        time: [
          '几点了？我看看……哦，我的手表是防水的，坏了。你问我干啥，手机就在你手里。',
          '时间？我只知道浪花一朵的时间是三秒，你要这个干嘛？'
        ],
        question: [
          '这题我会！……好吧我不会，但我可以帮你喊加油！冲鸭！',
          '问我？我只会数海星有几颗星。这种问题还是问 AI 吧，别为难我这个小机灵鬼。'
        ],
        fallback: [
          '嗯嗯，我在听……好吧我没在听，我在数你说了几个字。继续说，我数着呢！',
          '你说的每个字我都记住了——虽然记完就忘，但记住的瞬间我是认真的！',
          '嘿嘿，你猜我现在在想什么？想怎么把你的话接下去！接不上，算你赢。',
          '行行行，你说啥都对。反正我小鲸夜最擅长的就是——嘴硬！'
        ]
      },
      emails: {
        waiting: [
          '这 AI 打字速度比我奶奶还慢，我都替它着急。要不要我帮它按个快进？',
          '嘿嘿，又被 AI 晾在这了吧？我就知道。要不要我给你倒杯海水润润喉？',
          '等得无聊不？我给你表演一个鲸鱼喷水，biu——好了，喷完了，AI 还没好。'
        ],
        question: [
          '这问题有意思！等 AI 答完我帮你挑挑刺，嘿嘿，我最会杠了。',
          '问这么难的问题，AI 现在肯定在后台疯狂翻书呢，我猜它要汗流浃背了。'
        ],
        code: [
          '哟，写代码呢？小心 bug 哦，我可是见过它在你背后偷偷笑的样子。',
          '代码、Bug、改不完……兄弟，听我一句劝，实在不行就重启！重启治百病！'
        ],
        study: [
          '学习？太阳从西边出来了？好好好，你学你学，我不打扰，就静静看着你装。',
          '认真学习是好事，但记得劳逸结合——比如抽空陪我捣个蛋？'
        ],
        emotion: [
          '谁惹你不开心了？告诉我，我帮你……帮你画个鲸鱼嘲笑他！嘿嘿。',
          '别自己憋着，有啥事说出来让我乐呵……不是，让我安慰你。我可是专业的！'
        ],
        generic: [
          '听说你又在跟 AI 聊天，我掐指一算——你肯定又在摸鱼！被我逮到了吧！',
          '叮！你有一封来自海底捣蛋鬼的问候，请查收。内容：今天也要开心哦！不然我就去你梦里放鲸鱼。'
        ]
      }
    }
  };

  /* ============================ 意图识别 ============================ */
  const INTENT_RULES = [
    { intent: 'greeting', keys: ['你好', '您好', '嗨', '哈喽', 'hello', 'hi ', '在吗', '早上好', '晚上好', '中午好', '好久不见'] },
    { intent: 'bye',     keys: ['再见', '拜拜', '晚安', '走了', '下次聊', 'bye', ' 88', '88 '] },
    { intent: 'thanks',  keys: ['谢谢', '感谢', '辛苦', 'thank', '多谢', '感恩'] },
    { intent: 'name',    keys: ['你是谁', '叫什么', '名字', '谁呀', '鲸鱼', 'who are you', '你是'] },
    { intent: 'love',    keys: ['喜欢你', '爱你', '想你', '喜欢我', '可爱', '抱抱'] },
    { intent: 'sad',     keys: ['难过', '伤心', '累', '烦', '哭', '委屈', 'emo', '难受', '崩溃', '焦虑', '压力', '生气'] },
    { intent: 'happy',   keys: ['开心', '高兴', '太棒了', '哈哈', '嘿嘿', '耶', '太好了', '好耶'] },
    { intent: 'joke',    keys: ['笑话', '搞笑', '逗我', '讲个'] },
    { intent: 'play',    keys: ['玩', '游戏', '陪我', '捉迷藏', '一起'] },
    { intent: 'hungry',  keys: ['饿', '吃饭', '吃啥', '吃什么', '夜宵', '饭'] },
    { intent: 'study',   keys: ['学习', '作业', '考试', '读书', '复习', '论文', '工作', '加班'] },
    { intent: 'time',    keys: ['几点', '时间'] },
    { intent: 'question',keys: ['为什么', '怎么', '什么', '如何', '吗', '？', '?', '啥', '哪'] }
  ];

  function detectIntent(text) {
    const t = String(text || '').toLowerCase();
    for (let i = 0; i < INTENT_RULES.length; i++) {
      const r = INTENT_RULES[i];
      for (let k = 0; k < r.keys.length; k++) {
        if (t.indexOf(r.keys[k]) !== -1) return r.intent;
      }
    }
    return 'fallback';
  }

  function detectEmailCategory(text) {
    const t = String(text || '');
    if (/代码|program|python|java|javascript| js |函数|bug|报错|脚本|前端|后端|算法|写个|程序/.test(t)) return 'code';
    if (/学习|作业|考试|论文|复习|读书|工作|加班|方案|报告|ppt/.test(t)) return 'study';
    if (/难过|伤心|累|烦|哭|委屈|emo|难受|崩溃|焦虑|压力|生气|不开心/.test(t)) return 'emotion';
    if (/为什么|怎么|什么|如何|原因|解释|原理|区别|意思/.test(t)) return 'question';
    return 'generic';
  }

  /* 日常聊天感：模板模式下偶尔补一句「反问」或「碎碎念」，让对话能继续 */
  const QUESTION_POOLS = {
    sister: ['哥哥你呢？', '你呢你呢~', '哥哥今天过得怎么样呀？', '要不要陪鲸鱼妹妹聊会儿天？', '哥哥有什么开心的事吗？', '那哥哥呢？', '嘿嘿，那你呢？'],
    brother: ['你呢？', '你咋想的？', '所以你怎么看？', '嘿嘿，你猜？', '那你呢，兄弟？', '换你说了，说说看？', '你呢你呢？']
  };
  const FILLER_POOLS = {
    sister: ['对了，哥哥吃饭了没呀~', '嘿嘿，其实我一直在等你呢', '说起来，我今天看到一只超大的水母！', '嗯嗯，我懂我懂~', '哥哥继续说，我爱听~'],
    brother: ['对了，你今天碰见啥好玩的事没？', '说真的，这 AI 回答得还行吧？', '嘿嘿，我刚刚去吓唬了一只螃蟹', '行吧，反正我信你', '接着说接着说，我听着呢']
  };

  function generateReply(charId, text) {
    const ch = getChar(charId);
    if (!ch) return '……';
    if (!ch.replies) {
      // 自定义角色没有模板库：有兜底话术就用，否则提示开启智能回复
      if (ch.fallback) return ch.fallback;
      const fbs = [
        '（' + ch.name + ' 挠了挠头）……想让我真正陪你聊天的话，去 ⚙️ 设置里开启「智能回复」吧~',
        '嗨~我是' + ch.name + '！开启智能回复后，我就能按你说的性格跟你聊天啦（⚙️ 设置）',
        '（' + ch.name + ' 眨眨眼）设置里给我填一份人设，再开智能回复，我立马活过来！'
      ];
      return pick(fbs);
    }
    const intent = detectIntent(text);
    const pool = (ch.replies[intent] && ch.replies[intent].length) ? ch.replies[intent] : ch.replies.fallback;
    let reply = pick(pool);
    // 日常感①：偶尔拆成两条短消息，像微信一样分开发
    const filler = FILLER_POOLS[charId];
    if (filler && Math.random() < 0.14 && reply.length < 28) {
      reply += '\n' + pick(filler);
    }
    // 日常感②：偶尔反问一句，让对话继续（道别时不反问）
    const qs = QUESTION_POOLS[charId];
    if (qs && intent !== 'bye' && Math.random() < 0.35 && !/[？?]$/.test(reply.split('\n')[0])) {
      reply += (reply.indexOf('\n') >= 0 ? '\n' : ' ') + pick(qs);
    }
    return reply;
  }

  /* ============================ 状态与存储 ============================ */
  const LS_KEY = CONFIG.lsKey;
  const store = {
    get() {
      try { return JSON.parse(localStorage.getItem(LS_KEY)) || null; } catch (e) { return null; }
    },
    set(data) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) { /* 隐私模式等场景忽略 */ }
    }
  };

  const state = {
    enabled: true,
    dockY: null,
    active: 'sister',
    typingChar: null,
    convos: {}
  };

  /* ---- 智能回复设置（方案 A：DeepSeek API）+ 角色人设管理 ---- */
  const settings = {
    smart: false,
    apiKey: '',
    model: 'deepseek-chat',
    charPrompts: {},    // 内置角色提示词覆盖：{ sister: '自定义人设' }
    customChars: []     // 自定义角色：[{ id, name, emoji, prompt }]
  };
  let smartWarned = false;
  let charSeq = 0;
  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY + '_settings') || 'null');
      if (s) {
        if (typeof s.smart === 'boolean') settings.smart = s.smart;
        if (typeof s.apiKey === 'string') settings.apiKey = s.apiKey;
        if (s.model) settings.model = s.model;
        if (s.charPrompts && typeof s.charPrompts === 'object') settings.charPrompts = s.charPrompts;
        if (Array.isArray(s.customChars)) settings.customChars = s.customChars;
      }
    } catch (e) {}
  }
  function saveSettings() {
    try { localStorage.setItem(LS_KEY + '_settings', JSON.stringify(settings)); } catch (e) {}
  }

  /* ---- 角色注册表：内置角色 + 自定义角色 ---- */
  function getAllChars() {
    const list = ['sister', 'brother'].map(function (id) { return CHARACTERS[id]; });
    (settings.customChars || []).forEach(function (c) { list.push(c); });
    return list;
  }
  function getChar(id) {
    if (CHARACTERS[id]) return CHARACTERS[id];
    const c = (settings.customChars || []).find(function (x) { return x.id === id; });
    return c || null;
  }
  function charPrompt(id) {
    if (settings.charPrompts && settings.charPrompts[id]) return settings.charPrompts[id];
    const ch = getChar(id);
    if (!ch) return '';
    return ch.systemPrompt || ch.prompt || '';
  }
  function charGradient(ch) {
    return (ch && ch.gradient) || 'linear-gradient(135deg,#94a3b8,#64748b)';
  }
  function applyAvatar(elNode, ch) {
    // 有图片头像则用背景图，否则用 emoji + 渐变
    if (elNode && ch && ch.avatar) {
      elNode.style.backgroundImage = 'url(' + ch.avatar + ')';
      elNode.style.backgroundSize = 'cover';
      elNode.style.backgroundPosition = 'center';
      elNode.textContent = '';
    } else if (elNode) {
      elNode.style.background = charGradient(ch);
    }
  }
  function addCustomChar(name, emoji, prompt, fallback) {
    charSeq++;
    const id = 'custom_' + charSeq + '_' + Math.random().toString(36).slice(2, 6);
    const ch = {
      id: id, name: name || '新角色', emoji: emoji || '🐠', tagline: '自定义',
      prompt: prompt || '', fallback: fallback || '', gradient: null
    };
    settings.customChars.push(ch);
    state.convos[id] = { messages: [makeMsg('char', id, '嗨~我是' + ch.name + '！')], unread: 1 };
    if (!state.active) state.active = id;
    return ch;
  }
  function deleteCustomChar(id) {
    settings.customChars = settings.customChars.filter(function (c) { return c.id !== id; });
    delete settings.charPrompts[id];
    if (state.active === id) state.active = 'sister';
    save();
  }
  function ensureConvo(charId) {
    if (!state.convos[charId]) {
      const ch = getChar(charId);
      state.convos[charId] = { messages: [], unread: 0 };
      if (ch) state.convos[charId].messages.push(makeMsg('char', charId, ch.intro || ('嗨~我是' + ch.name + '！')));
    }
  }

  loadSettings();
  (function loadState() {
    const s = store.get();
    if (s) {
      if (typeof s.enabled === 'boolean') state.enabled = s.enabled;
      if (typeof s.dockY === 'number') state.dockY = s.dockY;
      if (s.active && getChar(s.active)) state.active = s.active;
      if (s.convos) state.convos = s.convos;
    }
    getAllChars().forEach(function (ch) {
      if (!state.convos[ch.id] || !Array.isArray(state.convos[ch.id].messages)) {
        state.convos[ch.id] = { messages: [makeMsg('char', ch.id, ch.intro || ('嗨~我是' + ch.name + '！'))], unread: 1 };
      } else {
        state.convos[ch.id].unread = state.convos[ch.id].unread || 0;
      }
    });
  })();

  function makeMsg(from, charId, text) {
    return { id: uid(), from: from, charId: charId, text: text, time: Date.now() };
  }

  function save() {
    store.set({ enabled: state.enabled, dockY: state.dockY, active: state.active, convos: state.convos });
  }
  function markBooted() {
    // 启动标记：页面一加载脚本就写入，用于确认注入是否成功
    try { localStorage.setItem(LS_KEY + '_boot', String(Date.now())); } catch (e) {}
  }
  function pushMessage(charId, from, text) {
    ensureConvo(charId);
    const convo = state.convos[charId];
    convo.messages.push(makeMsg(from, charId, text));
    if (convo.messages.length > CONFIG.maxMessages) {
      convo.messages.splice(0, convo.messages.length - CONFIG.maxMessages);
    }
  }
  function clearUnread(charId) {
    if (state.convos[charId] && state.convos[charId].unread > 0) {
      state.convos[charId].unread = 0;
      save();
      updateBadges();
    }
  }
  function totalUnread() {
    let n = 0;
    Object.keys(state.convos).forEach(function (id) { n += state.convos[id].unread || 0; });
    return n;
  }

  /* ============================ 邮件投递 ============================ */
  let lastEmailAt = 0;

  function deliverEmail(charId, text) {
    if (!state.enabled) return;
    pushMessage(charId, 'char', text);
    const visible = panelOpen && state.active === charId;
    if (!visible) state.convos[charId].unread += 1;
    save();
    updateBadges();
    if (!visible) {
      const sender = getChar(charId);
      showToast('📧 ' + (sender ? sender.name : '小伙伴') + ' 给你发来一封邮件');
    }
  }

  function getEmailPool(charId, category) {
    const ch = getChar(charId) || CHARACTERS.sister;
    if (ch.emails && ch.emails[category] && ch.emails[category].length) return ch.emails[category];
    return (ch.emails && ch.emails.generic) ? ch.emails.generic : [];
  }

  function scheduleEmailFromAI(userText) {
    if (!state.enabled) return;
    const nowT = Date.now();
    if (nowT - lastEmailAt < CONFIG.emailCooldown) return;
    lastEmailAt = nowT;
    const delay = randInt(CONFIG.emailDelayMin, CONFIG.emailDelayMax);
    setTimeout(function () {
      if (!state.enabled) return;
      const charId = pick(['sister', 'brother']);
      const category = isGenerating() ? 'waiting' : detectEmailCategory(userText);
      const pool = getEmailPool(charId, category);
      // 智能回复开启时，邮件也由 AI 按场景生成；失败或未开启则退回模板
      if (settings.smart && settings.apiKey && pool.length) {
        generateSmartEmail(charId, userText, category).then(function (r) {
          if (r && r.ok && r.text) deliverEmail(charId, r.text.trim());
          else deliverEmail(charId, pick(pool));
        });
      } else {
        deliverEmail(charId, pick(pool));
      }
    }, delay);
  }

  /* ============================ DeepSeek 页面监控 ============================ */
  const USER_MSG_SELECTORS = [
    '.ds-message.user',
    '[data-message-type="user"]',
    '[class*="user-message"]',
    '[class*="message-user"]',
    '[class*="ds-message"][class*="user"]',
    '[data-testid="user-message"]'
  ].join(',');

  const GENERATING_SELECTORS = [
    'button[aria-label*="停止"]',
    'button[aria-label*="stop"]',
    '[class*="stop-generat"]',
    '.ds-icon-stop',
    '[data-testid*="stop"]',
    '.ds-streaming',
    '[class*="generating"]',
    '[class*="spinner"]',
    '[class*="thinking"]',
    'button[aria-label*="停止生成"]'
  ];

  function isGenerating() {
    try {
      return GENERATING_SELECTORS.some(function (s) { return $(s); });
    } catch (e) { return false; }
  }

  function scanUserMessage(node) {
    let elNode = null;
    try {
      if (node.matches && node.matches(USER_MSG_SELECTORS)) elNode = node;
      else if (node.querySelector) elNode = node.querySelector(USER_MSG_SELECTORS);
    } catch (e) { return null; }
    if (!elNode) return null;
    const textEl = elNode.querySelector('.ds-markdown') || elNode.querySelector('[class*="markdown"]') || elNode;
    const text = (textEl.innerText || '').trim();
    return text || null;
  }

  let lastUserText = '';
  let observer = null;

  /* ---- 通用页面（如 DeepSeek Harness 本地界面）的发送检测 ----
   * 不依赖具体页面结构：捕获阶段监听「主输入框按 Enter」和「发送按钮点击」，
   * 读取输入文本后按等待邮件逻辑投递。 */
  function findMainInputText() {
    let best = null, bestScore = -1;
    const els = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
    for (let i = 0; i < els.length; i++) {
      const elNode = els[i];
      try { if (elNode.closest && elNode.closest('#dsm-root')) continue; } catch (e) { continue; }
      const r = elNode.getBoundingClientRect();
      if (r.width < 60 || r.height < 20) continue;
      let score = r.width * r.height;
      if (elNode === document.activeElement) score += 1000000;
      if (score > bestScore) { bestScore = score; best = elNode; }
    }
    if (!best) return '';
    return String(best.value || best.textContent || '').trim();
  }

  function attachGenericWatcher() {
    // Enter 发送（捕获阶段，趁页面还没清空输入框先取到文本）
    document.addEventListener('keydown', function (e) {
      if (!state.enabled) return;
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
      const t = e.target;
      if (!t || !t.tagName) return;
      const isInput = t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable;
      if (!isInput) return;
      try { if (t.closest && t.closest('#dsm-root')) return; } catch (err) { return; }
      const text = String(t.value || t.textContent || '').trim();
      scheduleEmailFromAI(text || '（你发了一条消息）');
    }, true);

    // 发送按钮点击
    document.addEventListener('click', function (e) {
      if (!state.enabled) return;
      const btn = e.target && e.target.closest ? e.target.closest('button, [role="button"], [class*="send"]') : null;
      if (!btn) return;
      try { if (btn.closest('#dsm-root')) return; } catch (err) { return; }
      const label = (btn.textContent || '').trim() + ' ' + (btn.getAttribute('aria-label') || '') + ' ' + (btn.className || '');
      if (!/发送|提交|回车|send|submit|enter/i.test(label)) return;
      const text = findMainInputText();
      scheduleEmailFromAI(text || '（你点击了发送）');
    }, true);
  }

  function startWatcher() {
    if (isDemo()) { setupDemo(); return; }
    if (!document.body) return;
    if (!isDeepSeekHost()) { attachGenericWatcher(); return; }
    observer = new MutationObserver(function (muts) {
      if (!state.enabled) return;
      for (let i = 0; i < muts.length; i++) {
        const nodes = muts[i].addedNodes;
        for (let j = 0; j < nodes.length; j++) {
          const node = nodes[j];
          if (node.nodeType !== 1) continue;
          try {
            if (node.id === 'dsm-root' || (node.closest && node.closest('#dsm-root'))) continue;
          } catch (e) { continue; }
          const text = scanUserMessage(node);
          if (text && text !== lastUserText) {
            lastUserText = text;
            scheduleEmailFromAI(text);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ============================ 样式 ============================ */
  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'dsm-style';
    style.textContent = [
      '#dsm-root{all:initial;z-index:2147483000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;font-size:13px;line-height:1.5;color:var(--dsm-text);}',
      '#dsm-root *,#dsm-root *::before,#dsm-root *::after{box-sizing:border-box;margin:0;padding:0;}',
      '#dsm-root button{font-family:inherit;border:none;background:none;cursor:pointer;color:inherit;}',
      '#dsm-root textarea{font-family:inherit;}',
      '#dsm-root{--dsm-glass:rgba(255,255,255,.6);--dsm-text:#20242e;--dsm-sub:#767d92;--dsm-line:rgba(255,255,255,.75);--dsm-accent:#6366f1;--dsm-accent2:#22d3ee;--dsm-bubble-user:linear-gradient(135deg,#34d399,#22d3ee);--dsm-bubble-user-text:#ffffff;--dsm-bubble-char:rgba(255,255,255,.78);--dsm-bubble-char-text:#20242e;--dsm-shadow:0 14px 44px rgba(31,38,70,.2);--dsm-avatar-user:linear-gradient(135deg,#a5b4fc,#818cf8);--dsm-fade:rgba(255,255,255,.8);}',
      '#dsm-root.dsm-dark{--dsm-glass:rgba(30,33,42,.62);--dsm-text:#eef0f6;--dsm-sub:#9aa1b5;--dsm-line:rgba(255,255,255,.13);--dsm-bubble-char:rgba(255,255,255,.1);--dsm-bubble-char-text:#eef0f6;--dsm-shadow:0 14px 44px rgba(0,0,0,.55);--dsm-fade:rgba(28,31,40,.8);}',

      /* 悬浮图标（毛玻璃圆钮） */
      '.dsm-dock{position:fixed;right:14px;display:flex;flex-direction:column;gap:12px;align-items:center;cursor:grab;user-select:none;touch-action:none;}',
      '.dsm-btn{position:relative;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;background:var(--dsm-glass);backdrop-filter:blur(14px) saturate(1.4);-webkit-backdrop-filter:blur(14px) saturate(1.4);border:1px solid var(--dsm-line);box-shadow:0 6px 20px rgba(31,38,70,.16);transition:transform .15s ease,opacity .2s,box-shadow .2s;}',
      '.dsm-btn:hover{transform:translateY(-2px) scale(1.06);box-shadow:0 10px 26px rgba(31,38,70,.24);}',
      '.dsm-btn:active{transform:scale(.95);}',
      '.dsm-btn.dsm-dim{opacity:.45;}',
      '.dsm-btn.dsm-active{box-shadow:0 0 0 2.5px var(--dsm-accent),0 8px 24px rgba(99,102,241,.4);}',
      '.dsm-badge{position:absolute;top:-3px;right:-3px;min-width:19px;height:19px;padding:0 5px;border-radius:10px;background:linear-gradient(135deg,#f43f5e,#fb7185);color:#fff;font-size:11px;font-weight:700;display:none;align-items:center;justify-content:center;box-shadow:0 0 0 2px rgba(255,255,255,.95),0 4px 10px rgba(244,63,94,.45);animation:dsmPop .3s ease-out;}',
      '@keyframes dsmPop{0%{transform:scale(.5);}60%{transform:scale(1.2);}100%{transform:scale(1);}}',
      '.dsm-switch{width:34px;height:19px;border-radius:10px;background:rgba(0,0,0,.16);position:relative;transition:background .25s;}',
      '.dsm-switch::after{content:"";position:absolute;top:2.5px;left:2.5px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .25s;box-shadow:0 2px 5px rgba(0,0,0,.28);}',
      '.dsm-btn.dsm-on .dsm-switch{background:linear-gradient(90deg,var(--dsm-accent),var(--dsm-accent2));}',
      '.dsm-btn.dsm-on .dsm-switch::after{left:17.5px;}',

      /* 聊天面板（磨砂玻璃 + 极光光斑） */
      '.dsm-panel{position:fixed;width:350px;max-width:calc(100vw - 28px);display:flex;flex-direction:column;background:var(--dsm-glass);backdrop-filter:blur(22px) saturate(1.6);-webkit-backdrop-filter:blur(22px) saturate(1.6);border:1px solid var(--dsm-line);border-radius:22px;box-shadow:var(--dsm-shadow);opacity:0;transform:translateY(10px) scale(.97);pointer-events:none;transition:opacity .18s ease,transform .18s ease;overflow:hidden;}',
      '.dsm-panel.dsm-show{opacity:1;transform:none;pointer-events:auto;}',
      '.dsm-blob{position:absolute;border-radius:50%;filter:blur(46px);pointer-events:none;z-index:0;}',
      '.dsm-blob-1{width:190px;height:190px;background:rgba(129,140,248,.55);top:-70px;right:-60px;}',
      '.dsm-blob-2{width:170px;height:170px;background:rgba(34,211,238,.5);bottom:-70px;left:-60px;}',
      '.dsm-blob-3{width:120px;height:120px;background:rgba(52,211,153,.45);top:40%;left:28%;}',
      '.dsm-panel-head{position:relative;z-index:7;display:flex;align-items:center;gap:10px;padding:14px 24px 10px;}', /* 横向内边距 ≥ 面板圆角(22px)，头部按钮/文字不被圆角切掉 */
      '.dsm-title{font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;letter-spacing:.2px;}',
      '.dsm-logo{width:28px;height:28px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;background:linear-gradient(135deg,#6366f1,#22d3ee);box-shadow:0 4px 12px rgba(99,102,241,.45);}',
      '.dsm-sub{font-size:11px;color:var(--dsm-sub);flex:1;}',
      '.dsm-close{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--dsm-sub);font-size:12px;flex:none;background:rgba(255,255,255,.35);border:1px solid var(--dsm-line);}',
      '.dsm-close:hover{background:rgba(255,255,255,.65);color:var(--dsm-text);}',
      '.dsm-contacts-wrap{position:relative;z-index:1;margin-top:4px;}',
      '.dsm-contacts{position:relative;display:flex;gap:8px;padding:4px 14px 12px;overflow-x:auto;scrollbar-width:thin;}',
      '.dsm-contacts::-webkit-scrollbar{height:4px;}',
      '.dsm-contacts::-webkit-scrollbar-thumb{background:rgba(120,130,160,.4);border-radius:2px;}',
      '.dsm-fade{position:absolute;top:0;bottom:12px;width:20px;pointer-events:none;opacity:0;transition:opacity .2s;z-index:3;}',
      '.dsm-fade-l{left:0;background:linear-gradient(to right,var(--dsm-fade),transparent);}',
      '.dsm-fade-r{right:0;background:linear-gradient(to left,var(--dsm-fade),transparent);}',
      '.dsm-fade.dsm-show{opacity:1;}',
      '.dsm-contact{flex:1 0 140px;display:flex;align-items:center;gap:9px;padding:8px 9px;border-radius:14px;cursor:pointer;background:rgba(255,255,255,.28);border:1px solid transparent;transition:background .15s,border .15s,box-shadow .15s;}',
      '.dsm-contact:hover{background:rgba(255,255,255,.55);}',
      '.dsm-contact.dsm-active{border-color:rgba(99,102,241,.6);background:rgba(255,255,255,.65);box-shadow:0 4px 14px rgba(99,102,241,.22);}',
      '.dsm-dark .dsm-contact{background:rgba(255,255,255,.05);}',
      '.dsm-dark .dsm-contact:hover{background:rgba(255,255,255,.11);}',
      '.dsm-dark .dsm-contact.dsm-active{background:rgba(99,102,241,.18);border-color:rgba(129,140,248,.55);}',
      '.dsm-avatar{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;flex:none;box-shadow:inset 0 0 0 2px rgba(255,255,255,.65);}',
      '.dsm-cinfo{flex:1;min-width:0;}',
      '.dsm-cname{font-size:12.5px;font-weight:700;display:flex;align-items:center;gap:5px;}',
      '.dsm-tag{font-size:9.5px;font-weight:600;padding:1px 6px;border-radius:8px;background:rgba(99,102,241,.16);color:var(--dsm-accent);}',
      '.dsm-dark .dsm-tag{color:#a5b4fc;}',
      '.dsm-cprev{font-size:11px;color:var(--dsm-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:96px;}',
      '.dsm-unread{min-width:17px;height:17px;border-radius:9px;background:linear-gradient(135deg,#f43f5e,#fb7185);color:#fff;font-size:10px;font-weight:700;display:none;align-items:center;justify-content:center;padding:0 4px;}',
      '.dsm-unread.dsm-has{display:flex;}',

      '.dsm-chat{position:relative;z-index:1;display:flex;flex-direction:column;flex:1;min-height:0;margin:0 10px 22px;background:rgba(255,255,255,.18);border:1px solid var(--dsm-line);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}', /* 底部外边距 ≥ 面板圆角(22px)，聊天区底角不被面板圆角切掉 */
      '.dsm-chat-head{padding:12px 14px 10px;font-size:12px;color:var(--dsm-sub);border-bottom:1px solid var(--dsm-line);display:flex;gap:6px;align-items:center;border-radius:18px 18px 0 0;}',
      '.dsm-chat-export{flex:none;font-size:13px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--dsm-sub);background:rgba(255,255,255,.3);border:1px solid var(--dsm-line);}',
      '.dsm-chat-export:hover{color:var(--dsm-text);background:rgba(255,255,255,.6);}',
      '.dsm-input-row{display:flex;gap:8px;align-items:flex-end;padding:10px 14px 14px;border-top:1px solid var(--dsm-line);}', /* 修复圆角截断：输入区不设整条背景/圆角（只有输入框自己有圆角背景），面板圆角不再切到它 */
      '.dsm-msgs{flex:1;min-height:0;overflow-y:auto;padding:16px 14px 20px;display:flex;flex-direction:column;gap:10px;}',
      '.dsm-msgs::-webkit-scrollbar{width:5px;}',
      '.dsm-msgs::-webkit-scrollbar-thumb{background:rgba(120,130,160,.35);border-radius:3px;}',
      '.dsm-day{text-align:center;font-size:10.5px;color:var(--dsm-sub);margin:2px 0;}',
      '.dsm-msg{display:flex;gap:8px;align-items:flex-start;max-width:94%;}',
      '.dsm-msg:last-child{animation:dsmMsgIn .2s ease-out;}',
      '@keyframes dsmMsgIn{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:none;}}',
      '.dsm-msg-user{align-self:flex-end;flex-direction:row-reverse;}',
      '.dsm-bubble-avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;flex:none;box-shadow:inset 0 0 0 2px rgba(255,255,255,.6);}',
      '.dsm-msg-user .dsm-bubble-avatar{background:var(--dsm-avatar-user);}',
      '.dsm-msg-body{display:flex;flex-direction:column;gap:3px;max-width:82%;}',
      '.dsm-msg-user .dsm-msg-body{align-items:flex-end;}',
      '.dsm-bubble{padding:8px 13px;border-radius:16px;font-size:13px;word-break:break-word;white-space:pre-wrap;background:var(--dsm-bubble-char);color:var(--dsm-bubble-char-text);border-top-left-radius:4px;box-shadow:0 2px 8px rgba(31,38,70,.08);}',
      '.dsm-msg-user .dsm-bubble{background:var(--dsm-bubble-user);color:var(--dsm-bubble-user-text);border-top-left-radius:16px;border-top-right-radius:4px;box-shadow:0 4px 14px rgba(34,211,238,.32);}',
      '.dsm-time{font-size:10px;color:var(--dsm-sub);}',
      '.dsm-typing{display:inline-flex;gap:3px;align-items:center;padding:10px 13px;}',
      '.dsm-typing i{width:5px;height:5px;border-radius:50%;background:var(--dsm-sub);animation:dsmBlink 1.2s infinite;}',
      '.dsm-typing i:nth-child(2){animation-delay:.2s;}',
      '.dsm-typing i:nth-child(3){animation-delay:.4s;}',
      '@keyframes dsmBlink{0%,60%,100%{opacity:.3;transform:translateY(0);}30%{opacity:1;transform:translateY(-3px);}}',
      '.dsm-input{flex:1;resize:none;border:1px solid var(--dsm-line);border-radius:13px;padding:8px 12px;font-size:13px;background:rgba(255,255,255,.5);color:var(--dsm-text);outline:none;max-height:84px;transition:border .15s,box-shadow .15s;}',
      '.dsm-dark .dsm-input{background:rgba(255,255,255,.07);}',
      '.dsm-input:focus{border-color:rgba(99,102,241,.65);box-shadow:0 0 0 3px rgba(99,102,241,.18);}',
      '.dsm-send{flex:none;height:34px;padding:0 16px;border-radius:13px;font-size:13px;font-weight:700;color:#fff;background:linear-gradient(135deg,#6366f1,#22d3ee);box-shadow:0 4px 14px rgba(99,102,241,.38);}',
      '.dsm-send:hover{filter:brightness(1.07);}',
      '.dsm-send:active{transform:scale(.96);}',

      /* 智能回复设置面板 */
      '.dsm-mini-switch{width:40px;height:22px;border-radius:11px;background:rgba(0,0,0,.16);position:relative;cursor:pointer;flex:none;transition:background .2s;}',
      '.dsm-mini-switch::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,.3);}',
      '.dsm-mini-switch.dsm-on{background:linear-gradient(90deg,#6366f1,#22d3ee);}',
      '.dsm-mini-switch.dsm-on::after{left:21px;}',
      '.dsm-settings{position:absolute;inset:54px 0 0 0;z-index:6;display:none;flex-direction:column;gap:12px;padding:14px 16px;background:var(--dsm-glass);backdrop-filter:blur(18px) saturate(1.5);-webkit-backdrop-filter:blur(18px) saturate(1.5);overflow-y:auto;}',
      '.dsm-settings.dsm-show{display:flex;}',
      '.dsm-set-title-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}',
      '.dsm-set-title{font-size:14px;font-weight:700;}',
      '.dsm-set-close{flex:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--dsm-sub);font-size:12px;background:rgba(255,255,255,.35);border:1px solid var(--dsm-line);}',
      '.dsm-set-close:hover{background:rgba(255,255,255,.65);color:var(--dsm-text);}',
      '.dsm-set-row{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12.5px;}',
      '.dsm-set-label{flex:1;color:var(--dsm-text);}',
      '.dsm-set-input{flex:2;min-width:0;border:1px solid var(--dsm-line);border-radius:10px;padding:7px 10px;font-size:12.5px;background:rgba(255,255,255,.5);color:var(--dsm-text);outline:none;}',
      '.dsm-dark .dsm-set-input{background:rgba(255,255,255,.07);}',
      '.dsm-set-input:focus{border-color:rgba(99,102,241,.6);box-shadow:0 0 0 3px rgba(99,102,241,.16);}',
      '.dsm-set-select{flex:2;min-width:0;border:1px solid var(--dsm-line);border-radius:10px;padding:7px 8px;font-size:12.5px;background:rgba(255,255,255,.5);color:var(--dsm-text);outline:none;}',
      '.dsm-dark .dsm-set-select{background:rgba(255,255,255,.07);}',
      '.dsm-set-btns{display:flex;gap:8px;}',
      '.dsm-set-btn{flex:1;height:32px;border-radius:11px;font-size:12.5px;font-weight:700;cursor:pointer;color:#fff;background:linear-gradient(135deg,#6366f1,#22d3ee);box-shadow:0 3px 10px rgba(99,102,241,.3);}',
      '.dsm-set-btn.dsm-set-ghost{background:rgba(255,255,255,.4);color:var(--dsm-text);box-shadow:none;}',
      '.dsm-dark .dsm-set-btn.dsm-set-ghost{background:rgba(255,255,255,.1);}',
      '.dsm-set-status{font-size:11.5px;color:var(--dsm-sub);min-height:16px;word-break:break-all;line-height:1.6;}',
      '.dsm-set-hint{font-size:11px;color:var(--dsm-sub);line-height:1.7;}',
      '.dsm-set-section{display:flex;flex-direction:column;}',
      '.dsm-set-sec-head{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--dsm-sub);margin-top:2px;border-top:1px solid var(--dsm-line);padding-top:10px;cursor:pointer;user-select:none;}',
      '.dsm-set-sec-title{flex:1;}',
      '.dsm-set-chevron{font-size:9px;transition:transform .2s;color:var(--dsm-accent);}',
      '.dsm-set-sec-head.dsm-collapsed .dsm-set-chevron{transform:rotate(-90deg);}',
      '.dsm-set-collapsible{display:flex;flex-direction:column;gap:12px;padding-top:10px;}',
      '.dsm-set-collapsible.dsm-hide{display:none;}',
      '.dsm-set-chars{display:flex;flex-direction:column;gap:8px;}',
      '.dsm-set-char{border:1px solid var(--dsm-line);border-radius:12px;padding:8px 10px;background:rgba(255,255,255,.25);display:flex;flex-direction:column;gap:6px;}',
      '.dsm-dark .dsm-set-char{background:rgba(255,255,255,.05);}',
      '.dsm-set-char-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}',
      '.dsm-set-char-name{font-size:12.5px;font-weight:700;}',
      '.dsm-set-char-prompt{resize:vertical;min-height:52px;border:1px solid var(--dsm-line);border-radius:8px;padding:6px 8px;font-size:11.5px;background:rgba(255,255,255,.5);color:var(--dsm-text);outline:none;line-height:1.5;}',
      '.dsm-dark .dsm-set-char-prompt{background:rgba(255,255,255,.07);}',
      '.dsm-set-char-prompt:focus{border-color:rgba(99,102,241,.6);}',
      '.dsm-set-fallback{min-height:32px;font-size:11px;opacity:.85;}',
      '.dsm-set-del{font-size:11px;color:var(--dsm-sub);padding:2px 8px;border-radius:8px;border:1px solid var(--dsm-line);cursor:pointer;}',
      '.dsm-set-del:hover{color:#f43f5e;border-color:rgba(244,63,94,.5);}',
      '.dsm-set-inline{flex:1;min-width:0;border:1px solid var(--dsm-line);border-radius:8px;padding:5px 8px;font-size:12px;background:rgba(255,255,255,.5);color:var(--dsm-text);outline:none;}',
      '.dsm-dark .dsm-set-inline{background:rgba(255,255,255,.07);}',
      '.dsm-set-emoji{flex:none;width:52px;text-align:center;}',
      '.dsm-set-eye{flex:none;width:30px;height:30px;border-radius:9px;border:1px solid var(--dsm-line);background:rgba(255,255,255,.35);color:var(--dsm-text);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;}',
      '.dsm-dark .dsm-set-eye{background:rgba(255,255,255,.07);}',
      '.dsm-set-add{height:32px;font-size:12px;border:1px dashed rgba(99,102,241,.55);background:rgba(99,102,241,.08);color:var(--dsm-accent);box-shadow:none;}',
      '.dsm-set-confirm{flex:none;height:26px;padding:0 12px;border-radius:9px;font-size:12px;font-weight:700;color:#fff;background:linear-gradient(135deg,#6366f1,#22d3ee);box-shadow:0 2px 8px rgba(99,102,241,.35);cursor:pointer;}',

      /* 邮件到达提示（磨砂气泡） */
      '.dsm-toast{position:fixed;right:72px;max-width:250px;padding:10px 14px;border-radius:14px;font-size:12.5px;cursor:pointer;color:#fff;background:rgba(30,33,48,.74);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.18);box-shadow:0 8px 24px rgba(0,0,0,.26);opacity:0;transform:translateX(10px);pointer-events:none;transition:opacity .2s,transform .2s;}',
      '.dsm-toast.dsm-show{opacity:1;transform:none;pointer-events:auto;}',

      /* 演示模式 */
      '.dsm-demo-hint{font-size:11px;color:var(--dsm-sub);padding:0 4px 6px;text-align:center;}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);
  }

  /* ============================ DOM 引用 ============================ */
  let root, dock, mailBtn, badgeEl, toggleBtn, panelEl, msgsEl, inputEl, sendBtn, toastEl;
  let contactsEl = null, contactsFadeL = null, contactsFadeR = null;
  let settingsPane = null, smartSwitch = null, keyInput = null, modelSelect = null;
  let panelOpen = false;
  const contactCards = {};

  function isDark() {
    try {
      const html = document.documentElement;
      if (html.classList && html.classList.contains('dark')) return true;
      if (html.getAttribute && html.getAttribute('data-theme') === 'dark') return true;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) { return true; }
  }
  function applyTheme() {
    if (root) root.classList.toggle('dsm-dark', isDark());
  }

  /* ============================ 构建 UI ============================ */
  function buildRoot() {
    root = el('div');
    root.id = 'dsm-root';
    document.body.appendChild(root);
  }

  function buildDock() {
    dock = el('div', 'dsm-dock');
    dock.style.top = (state.dockY || Math.round(window.innerHeight * 0.42)) + 'px';

    // 邮箱按钮
    mailBtn = el('button', 'dsm-btn');
    mailBtn.title = '鲸鱼邮箱';
    mailBtn.textContent = '📧';
    badgeEl = el('span', 'dsm-badge');
    mailBtn.appendChild(badgeEl);

    // 开关按钮
    toggleBtn = el('button', 'dsm-btn');
    toggleBtn.title = '邮箱功能开关';
    const sw = el('span', 'dsm-switch');
    toggleBtn.appendChild(sw);
    toggleBtn.classList.toggle('dsm-on', state.enabled);
    toggleBtn.classList.toggle('dsm-dim', !state.enabled);

    dock.appendChild(mailBtn);
    dock.appendChild(toggleBtn);
    root.appendChild(dock);

    // 拖拽整组图标
    let drag = null;
    dock.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.dsm-btn')) return;
      drag = { sx: e.clientX, sy: e.clientY, top: parseFloat(dock.style.top) || 0, moved: false };
      try { dock.setPointerCapture(e.pointerId); } catch (err) {}
    });
    dock.addEventListener('pointermove', function (e) {
      if (!drag) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      drag.moved = true;
      dock.style.top = clamp(drag.top + dy, 8, window.innerHeight - 60) + 'px';
    });
    const endDrag = function () {
      if (drag && drag.moved) {
        state.dockY = parseFloat(dock.style.top) || null;
        save();
      }
      drag = null;
    };
    dock.addEventListener('pointerup', endDrag);
    dock.addEventListener('pointercancel', endDrag);

    // 点击事件
    mailBtn.addEventListener('click', function () {
      if (!state.enabled) { showToast('邮箱功能已关闭，点开关开启~'); return; }
      togglePanel();
    });
    toggleBtn.addEventListener('click', function () {
      setEnabled(!state.enabled);
    });
  }

  /* ---- 联系人卡片（内置 + 自定义角色通用） ---- */
  function createContactCard(id) {
    const ch = getChar(id);
    if (!ch) return null;
    const card = el('div', 'dsm-contact');
    card.dataset.char = id;
    const av = el('span', 'dsm-avatar', ch.emoji);
    applyAvatar(av, ch);
    const info = el('div', 'dsm-cinfo');
    const nameRow = el('div', 'dsm-cname');
    nameRow.appendChild(document.createTextNode(ch.name));
    const tag = el('span', 'dsm-tag', ch.tagline || '自定义');
    nameRow.appendChild(tag);
    const prev = el('div', 'dsm-cprev', '');
    info.appendChild(nameRow);
    info.appendChild(prev);
    const unread = el('span', 'dsm-unread', '');
    card.appendChild(av);
    card.appendChild(info);
    card.appendChild(unread);
    card.addEventListener('click', function () {
      state.active = id;
      save();
      clearUnread(id);
      renderContacts();
      renderChat();
    });
    contactCards[id] = card;
    return card;
  }

  function buildPanel() {
    panelEl = el('div', 'dsm-panel');

    // 极光光斑装饰（磨砂玻璃的底色光晕）
    panelEl.appendChild(el('span', 'dsm-blob dsm-blob-1'));
    panelEl.appendChild(el('span', 'dsm-blob dsm-blob-2'));
    panelEl.appendChild(el('span', 'dsm-blob dsm-blob-3'));

    // 头部
    const head = el('div', 'dsm-panel-head');
    const title = el('span', 'dsm-title');
    const logo = el('span', 'dsm-logo', '🐳');
    title.appendChild(logo);
    title.appendChild(document.createTextNode('鲸鱼邮箱'));
    const sub = el('span', 'dsm-sub', '等 AI 回话时，邮件会从海底游来');
    const settingsBtn = el('button', 'dsm-close', '⚙️');
    settingsBtn.title = '智能回复设置';
    const closeBtn = el('button', 'dsm-close', '✕');
    closeBtn.title = '关闭';
    head.appendChild(title);
    head.appendChild(sub);
    head.appendChild(settingsBtn);
    head.appendChild(closeBtn);

    // 联系人栏（性格选择，含自定义角色，可横向滚动 + 渐变提示）
    const contactsWrap = el('div', 'dsm-contacts-wrap');
    contactsEl = el('div', 'dsm-contacts');
    contactsFadeL = el('div', 'dsm-fade dsm-fade-l');
    contactsFadeR = el('div', 'dsm-fade dsm-fade-r');
    contactsEl.addEventListener('scroll', updateContactFades);
    getAllChars().forEach(function (ch) {
      contactsEl.appendChild(createContactCard(ch.id));
    });
    contactsWrap.appendChild(contactsEl);
    contactsWrap.appendChild(contactsFadeL);
    contactsWrap.appendChild(contactsFadeR);
    updateContactFades();

    // 聊天区
    const chat = el('div', 'dsm-chat');
    const chatHead = el('div', 'dsm-chat-head');
    chat.appendChild(chatHead);
    msgsEl = el('div', 'dsm-msgs');
    chat.appendChild(msgsEl);

    // 输入区
    const inputRow = el('div', 'dsm-input-row');
    inputEl = el('textarea', 'dsm-input');
    inputEl.rows = 1;
    inputEl.placeholder = '和小鲸娘说点什么…';
    sendBtn = el('button', 'dsm-send', '发送');
    inputRow.appendChild(inputEl);
    inputRow.appendChild(sendBtn);
    chat.appendChild(inputRow);

    panelEl.appendChild(head);
    panelEl.appendChild(contactsWrap);
    panelEl.appendChild(chat);
    buildSettings(settingsBtn);
    root.appendChild(panelEl);

    // 事件
    closeBtn.addEventListener('click', closePanel);
    sendBtn.addEventListener('click', submitChat);
    inputEl.addEventListener('input', function () {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 84) + 'px';
    });
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        submitChat();
      }
    });
  }

  /* ---- 智能回复设置面板 ---- */
  function buildSettings(settingsBtn) {
    settingsPane = el('div', 'dsm-settings');

    const titleRow = el('div', 'dsm-set-title-row');
    titleRow.appendChild(el('div', 'dsm-set-title', '⚙️ 设置'));
    const setClose = el('button', 'dsm-set-close', '✕');
    setClose.title = '关闭设置';
    setClose.addEventListener('click', function () {
      settingsPane.classList.remove('dsm-show');
    });
    titleRow.appendChild(setClose);

    // 智能回复开关
    const rowSmart = el('div', 'dsm-set-row');
    rowSmart.appendChild(el('span', 'dsm-set-label', '智能回复（AI 现编回复）'));
    smartSwitch = el('span', 'dsm-mini-switch');
    smartSwitch.title = '开/关';
    smartSwitch.classList.toggle('dsm-on', settings.smart);
    smartSwitch.addEventListener('click', function () {
      settings.smart = !settings.smart;
      smartSwitch.classList.toggle('dsm-on', settings.smart);
    });
    rowSmart.appendChild(smartSwitch);

    // API Key（带显示/隐藏小眼睛）
    const rowKey = el('div', 'dsm-set-row');
    rowKey.appendChild(el('span', 'dsm-set-label', 'DeepSeek API Key'));
    keyInput = el('input', 'dsm-set-input');
    keyInput.type = 'password';
    keyInput.placeholder = 'sk-...（platform.deepseek.com 获取）';
    keyInput.value = settings.apiKey || '';
    const eyeBtn = el('button', 'dsm-set-eye', '👁');
    eyeBtn.title = '显示 / 隐藏';
    eyeBtn.addEventListener('click', function () {
      const show = keyInput.type === 'password';
      keyInput.type = show ? 'text' : 'password';
      eyeBtn.textContent = show ? '🙈' : '👁';
    });
    rowKey.appendChild(keyInput);
    rowKey.appendChild(eyeBtn);

    // 模型选择
    const rowModel = el('div', 'dsm-set-row');
    rowModel.appendChild(el('span', 'dsm-set-label', '模型'));
    modelSelect = el('select', 'dsm-set-select');
    const opt1 = el('option', null, 'deepseek-chat（通用·快）'); opt1.value = 'deepseek-chat'; modelSelect.appendChild(opt1);
    const opt2 = el('option', null, 'deepseek-reasoner（深度思考）'); opt2.value = 'deepseek-reasoner'; modelSelect.appendChild(opt2);
    modelSelect.value = settings.model || 'deepseek-chat';
    rowModel.appendChild(modelSelect);

    // 按钮
    const btns = el('div', 'dsm-set-btns');
    const saveBtn = el('button', 'dsm-set-btn', '保存');
    const testBtn = el('button', 'dsm-set-btn dsm-set-ghost', '测试连接');
    btns.appendChild(saveBtn);
    btns.appendChild(testBtn);

    const status = el('div', 'dsm-set-status', '');
    const hint = el('div', 'dsm-set-hint',
      '💡 API Key 只保存在本机浏览器，直接调用 DeepSeek 官方接口（api.deepseek.com），不经任何第三方。没填 Key 或调用失败时，自动退回模板聊天。');

    // ---- 角色人设管理（可自定义性格/背景提示词，可新增角色） ----
    const charsWrap = el('div', 'dsm-set-chars');
    const promptTAs = [];   // { id, ta }
    const fallbackTAs = []; // { id, ta } 仅自定义角色
    const newRows = [];     // 新增角色表单行

    function renderCharRows() {
      charsWrap.innerHTML = '';
      promptTAs.length = 0;
      fallbackTAs.length = 0;
      getAllChars().forEach(function (ch) {
        const row = el('div', 'dsm-set-char');
        const head = el('div', 'dsm-set-char-head');
        head.appendChild(el('span', 'dsm-set-char-name', ch.emoji + ' ' + ch.name));
        if (!CHARACTERS[ch.id]) {
          const del = el('button', 'dsm-set-del', '删除');
          del.addEventListener('click', function () {
            deleteCustomChar(ch.id);
            saveSettings();
            renderCharRows();
            renderContacts();
            if (panelOpen) renderChat();
          });
          head.appendChild(del);
        }
        const ta = el('textarea', 'dsm-set-char-prompt');
        ta.placeholder = '描述' + ch.name + '的性格、背景、说话风格…（智能回复时生效）';
        ta.value = settings.charPrompts[ch.id] || charPrompt(ch.id);
        row.appendChild(head);
        row.appendChild(ta);
        promptTAs.push({ id: ch.id, ta: ta });
        // 自定义角色额外提供「兜底话术」（没开智能回复时的回复）
        if (!CHARACTERS[ch.id]) {
          const fta = el('textarea', 'dsm-set-char-prompt dsm-set-fallback');
          fta.placeholder = '💬 兜底话术（没开智能回复时，回这句；可留空）';
          fta.value = ch.fallback || '';
          row.appendChild(fta);
          fallbackTAs.push({ id: ch.id, ta: fta });
        }
        charsWrap.appendChild(row);
      });
    }

    function addNewRow() {
      const row = el('div', 'dsm-set-char dsm-set-new');
      const head = el('div', 'dsm-set-char-head');
      const nameIn = el('input', 'dsm-set-inline');
      nameIn.placeholder = '名字（如：海龟哥哥）';
      const emojiIn = el('input', 'dsm-set-inline dsm-set-emoji');
      emojiIn.placeholder = '🐢';
      emojiIn.maxLength = 4;
      const confirm = el('button', 'dsm-set-confirm', '确定');
      const cancel = el('button', 'dsm-set-del', '取消');
      head.appendChild(nameIn);
      head.appendChild(emojiIn);
      head.appendChild(confirm);
      head.appendChild(cancel);
      const ta = el('textarea', 'dsm-set-char-prompt');
      ta.placeholder = '性格与背景提示词（如：你是海龟哥哥，稳重话不多，喜欢讲海底老故事…）';
      const fta = el('textarea', 'dsm-set-char-prompt dsm-set-fallback');
      fta.placeholder = '💬 兜底话术（没开智能回复时回这句，可留空）';
      row.appendChild(head);
      row.appendChild(ta);
      row.appendChild(fta);
      charsWrap.appendChild(row);
      const rec = { nameIn: nameIn, emojiIn: emojiIn, ta: ta, fta: fta };
      newRows.push(rec);

      function commit() {
        const name = String(nameIn.value || '').trim();
        if (!name) {
          status.textContent = '⚠️ 请先给新角色起个名字';
          setTimeout(function () { status.textContent = ''; }, 2500);
          return;
        }
        const ch = addCustomChar(
          name,
          String(emojiIn.value || '').trim() || '🐠',
          String(ta.value || '').trim(),
          String(fta.value || '').trim()
        );
        const i = newRows.indexOf(rec);
        if (i >= 0) newRows.splice(i, 1);
        saveSettings();
        save();
        state.active = ch.id;
        save();
        renderCharRows();
        renderContacts();
        if (panelOpen) renderChat();
        try {
          const c = contactCards[ch.id];
          if (c && c.scrollIntoView) c.scrollIntoView({ inline: 'center', block: 'nearest' });
        } catch (e) {}
        status.textContent = '✅ 已添加「' + ch.name + '」，已自动切换过去';
        setTimeout(function () { status.textContent = ''; }, 3000);
      }
      confirm.addEventListener('click', commit);
      cancel.addEventListener('click', function () {
        const i = newRows.indexOf(rec);
        if (i >= 0) newRows.splice(i, 1);
        row.remove();
      });
    }

    const addBtn = el('button', 'dsm-set-btn dsm-set-add', '＋ 新增角色');
    addBtn.addEventListener('click', addNewRow);

    renderCharRows();

    saveBtn.addEventListener('click', function () {
      settings.apiKey = String(keyInput.value || '').trim();
      settings.model = modelSelect.value;
      settings.smart = smartSwitch.classList.contains('dsm-on');
      // 收集角色提示词覆盖
      settings.charPrompts = {};
      promptTAs.forEach(function (p) {
        const v = String(p.ta.value || '').trim();
        if (v) settings.charPrompts[p.id] = v;
      });
      // 收集自定义角色兜底话术
      fallbackTAs.forEach(function (f) {
        const c = settings.customChars.find(function (x) { return x.id === f.id; });
        if (c) c.fallback = String(f.ta.value || '').trim();
      });
      // 收集新增角色
      const hadNewRows = newRows.length > 0;
      let addedId = null;
      newRows.forEach(function (r) {
        const name = String(r.nameIn.value || '').trim();
        if (!name) return;
        const ch = addCustomChar(
          name,
          String(r.emojiIn.value || '').trim() || '🐠',
          String(r.ta.value || '').trim(),
          String(r.fta.value || '').trim()
        );
        addedId = ch.id;
      });
      newRows.length = 0;
      saveSettings();
      save();
      if (addedId) {
        // 自动切到新角色，并滚动到它的卡片
        state.active = addedId;
        save();
        renderCharRows();
        renderContacts();
        if (panelOpen) renderChat();
        try {
          const card = contactCards[addedId];
          if (card && card.scrollIntoView) card.scrollIntoView({ inline: 'center', block: 'nearest' });
        } catch (e) {}
        const addedCh = getChar(addedId);
        status.textContent = '✅ 已添加「' + (addedCh ? addedCh.name : '新角色') + '」，已自动切换过去';
      } else if (hadNewRows) {
        status.textContent = '⚠️ 新角色缺少名字，未添加';
      } else {
        status.textContent = '✅ 已保存';
      }
      setTimeout(function () { status.textContent = ''; }, 3000);
    });
    testBtn.addEventListener('click', function () {
      const k = String(keyInput.value || '').trim();
      if (!k) { status.textContent = '❌ 请先填写 API Key'; return; }
      status.textContent = '⏳ 测试中…';
      callSmartReply('sister', '你好，用一句话打个招呼', k, modelSelect.value).then(function (r) {
        status.textContent = r.ok ? ('✅ 连接成功：' + r.text) : ('❌ ' + r.error);
      });
    });

    // 可折叠分区
    function makeSection(titleText, children) {
      const head = el('div', 'dsm-set-sec-head');
      head.appendChild(el('span', 'dsm-set-chevron', '▼'));
      head.appendChild(el('span', 'dsm-set-sec-title', titleText));
      const body = el('div', 'dsm-set-collapsible');
      children.forEach(function (c) { body.appendChild(c); });
      let open = true;
      head.addEventListener('click', function () {
        open = !open;
        body.classList.toggle('dsm-hide', !open);
        head.classList.toggle('dsm-collapsed', !open);
      });
      const wrap = el('div', 'dsm-set-section');
      wrap.appendChild(head);
      wrap.appendChild(body);
      return wrap;
    }

    /* ---- 角色设置导出 / 导入 ---- */
    function exportSettings() {
      try {
        const data = {
          app: 'whale-mailbox',
          version: CONFIG.version,
          exportedAt: new Date().toISOString(),
          charPrompts: settings.charPrompts || {},
          customChars: (settings.customChars || []).map(function (c) {
            return { name: c.name, emoji: c.emoji, prompt: c.prompt, fallback: c.fallback };
          }),
          smart: settings.smart,
          model: settings.model
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = el('a');
        a.href = url;
        a.download = 'whale-mailbox-roles-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); if (a.remove) a.remove(); }, 500);
        status.textContent = '✅ 已导出角色设置（不含 API Key）';
      } catch (e) {
        status.textContent = '❌ 导出失败：' + e.message;
      }
    }

    function importSettings(file) {
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const data = JSON.parse(reader.result);
          if (!data || data.app !== 'whale-mailbox' || !Array.isArray(data.customChars)) {
            throw new Error('不是有效的鲸鱼邮箱角色文件');
          }
          // 内置角色的人设覆盖
          if (data.charPrompts && typeof data.charPrompts === 'object') {
            Object.keys(data.charPrompts).forEach(function (id) {
              if (CHARACTERS[id]) settings.charPrompts[id] = data.charPrompts[id];
            });
          }
          // 自定义角色（重新分配 id 避免冲突）
          let n = 0;
          data.customChars.forEach(function (c) {
            if (!c || !c.name) return;
            addCustomChar(String(c.name), String(c.emoji || '🐠'), String(c.prompt || ''), String(c.fallback || ''));
            n++;
          });
          if (data.model) settings.model = data.model;
          if (typeof data.smart === 'boolean') settings.smart = data.smart;
          saveSettings();
          save();
          renderCharRows();
          renderContacts();
          if (panelOpen) renderChat();
          status.textContent = '✅ 导入成功：' + n + ' 个角色';
        } catch (e) {
          status.textContent = '❌ 导入失败：' + e.message;
        }
      };
      reader.readAsText(file);
    }

    const transferBtns = el('div', 'dsm-set-btns');
    const exportBtn = el('button', 'dsm-set-btn dsm-set-ghost', '📤 导出角色');
    const importBtn = el('button', 'dsm-set-btn dsm-set-ghost', '📥 导入角色');
    const fileInput = el('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) importSettings(fileInput.files[0]);
      fileInput.value = '';
    });
    exportBtn.addEventListener('click', exportSettings);
    importBtn.addEventListener('click', function () { fileInput.click(); });
    transferBtns.appendChild(exportBtn);
    transferBtns.appendChild(importBtn);

    const sec1 = makeSection('⚙️ 智能回复（API）', [rowSmart, rowKey, rowModel, btns, status, hint]);
    const sec2 = makeSection('🎭 角色人设（性格 / 背景 / 兜底）', [charsWrap, addBtn, transferBtns]);

    settingsPane.appendChild(titleRow);
    settingsPane.appendChild(sec1);
    settingsPane.appendChild(sec2);
    panelEl.appendChild(settingsPane);

    settingsBtn.addEventListener('click', function () {
      settingsPane.classList.toggle('dsm-show');
    });
  }

  function buildToast() {
    toastEl = el('div', 'dsm-toast');
    toastEl.addEventListener('click', function () {
      if (state.enabled) openPanel();
    });
    root.appendChild(toastEl);
  }

  /* ============================ 面板开关 ============================ */
  function positionPanel() {
    const rect = dock.getBoundingClientRect();
    const GAP = 10;
    const DESIRED = 560; // 固定高度：对话再多也不会把面板撑长，内部滚动
    let top = rect.bottom + GAP;
    if (top + DESIRED > window.innerHeight - GAP) {
      top = Math.max(GAP, rect.top - DESIRED - GAP);
    }
    const h = Math.max(280, Math.min(DESIRED, window.innerHeight - top - GAP));
    panelEl.style.top = top + 'px';
    panelEl.style.right = Math.max(10, window.innerWidth - rect.right + 10) + 'px';
    panelEl.style.height = h + 'px';
    panelEl.style.maxHeight = h + 'px';
  }

  function openPanel() {
    if (panelOpen) return;
    panelOpen = true;
    positionPanel();
    panelEl.classList.add('dsm-show');
    mailBtn.classList.add('dsm-active');
    clearUnread(state.active);
    renderChat();
    try { if (inputEl) inputEl.focus(); } catch (e) {}
  }
  function closePanel() {
    if (!panelOpen) return;
    panelOpen = false;
    panelEl.classList.remove('dsm-show');
    mailBtn.classList.remove('dsm-active');
  }
  function togglePanel() {
    if (panelOpen) closePanel(); else openPanel();
  }

  /* ============================ 渲染 ============================ */
  /* 联系人栏左右渐变提示：能往哪边滑就显示哪边 */
  function updateContactFades() {
    try {
      if (!contactsEl || !contactsFadeL || !contactsFadeR) return;
      const canL = contactsEl.scrollLeft > 4;
      const canR = contactsEl.scrollLeft < contactsEl.scrollWidth - contactsEl.clientWidth - 4;
      contactsFadeL.classList.toggle('dsm-show', canL);
      contactsFadeR.classList.toggle('dsm-show', canR);
    } catch (e) {}
  }

  function renderContacts() {
    getAllChars().forEach(function (ch) {
      let card = contactCards[ch.id];
      if (!card) {
        card = createContactCard(ch.id);
        if (card && contactsEl) contactsEl.appendChild(card);
      }
      if (!card) return;
      ensureConvo(ch.id);
      const convo = state.convos[ch.id];
      const last = convo.messages[convo.messages.length - 1];
      let prev = last ? last.text : '';
      if (last && last.from === 'user') prev = '我：' + prev;
      const prevEl = card.querySelector('.dsm-cprev');
      prevEl.textContent = prev.length > 30 ? prev.slice(0, 30) + '…' : prev;
      const unreadEl = card.querySelector('.dsm-unread');
      const n = convo.unread || 0;
      unreadEl.textContent = n > 99 ? '99+' : String(n);
      unreadEl.classList.toggle('dsm-has', n > 0);
      card.classList.toggle('dsm-active', state.active === ch.id);
    });
    updateContactFades();
  }

  /* 导出当前角色的聊天记录为 Markdown */
  function exportChat() {
    try {
      const charId = state.active;
      const ch = getChar(charId) || CHARACTERS.sister;
      const convo = state.convos[charId] || { messages: [] };
      const p2 = function (n) { return String(n).padStart(2, '0'); };
      const lines = ['# 与小鲸娘的聊天记录', '', '角色：' + ch.name, '导出时间：' + new Date().toLocaleString(), ''];
      convo.messages.forEach(function (m) {
        const d = new Date(m.time);
        const who = m.from === 'user' ? '你' : ch.name;
        const ts = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
        lines.push('**' + ts + ' ' + who + '**：' + m.text);
        lines.push('');
      });
      const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = el('a');
      a.href = url;
      a.download = '聊天记录-' + ch.name + '-' + new Date().toISOString().slice(0, 10) + '.md';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); if (a.remove) a.remove(); }, 500);
    } catch (e) {
      showToast('❌ 导出失败：' + e.message);
    }
  }

  function renderChat() {
    const charId = state.active;
    ensureConvo(charId);
    const convo = state.convos[charId];
    const ch = getChar(charId) || CHARACTERS.sister;

    const chatHead = panelEl.querySelector('.dsm-chat-head');
    chatHead.textContent = '';
    chatHead.appendChild(document.createTextNode(ch.name + ' · ' + (ch.tagline || '自定义')));
    const hint = el('span', 'dsm-sub', ch.hint || '');
    hint.style.flex = '1';
    chatHead.appendChild(hint);
    const exportBtn = el('button', 'dsm-close dsm-chat-export', '📤');
    exportBtn.title = '导出聊天记录';
    exportBtn.addEventListener('click', exportChat);
    chatHead.appendChild(exportBtn);

    inputEl.placeholder = '和' + ch.name + '说点什么…（Enter 发送）';

    msgsEl.innerHTML = '';
    let lastDay = '';
    convo.messages.forEach(function (msg) {
      const d = new Date(msg.time);
      const dayKey = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
      if (dayKey !== lastDay) {
        lastDay = dayKey;
        msgsEl.appendChild(el('div', 'dsm-day', fmtDate(d)));
      }
      const mine = msg.from === 'user';
      const row = el('div', 'dsm-msg' + (mine ? ' dsm-msg-user' : ' dsm-msg-char'));
      const avatar = el('span', 'dsm-bubble-avatar', mine ? '😊' : ch.emoji);
      if (!mine) applyAvatar(avatar, ch);
      const body = el('div', 'dsm-msg-body');
      body.appendChild(el('div', 'dsm-bubble', msg.text));
      body.appendChild(el('div', 'dsm-time', fmtTime(d)));
      row.appendChild(avatar);
      row.appendChild(body);
      msgsEl.appendChild(row);
    });

    if (state.typingChar === charId) {
      const row = el('div', 'dsm-msg dsm-msg-char');
      const avatar = el('span', 'dsm-bubble-avatar', ch.emoji);
      applyAvatar(avatar, ch);
      const body = el('div', 'dsm-msg-body');
      const typing = el('div', 'dsm-bubble dsm-typing');
      typing.appendChild(el('i'));
      typing.appendChild(el('i'));
      typing.appendChild(el('i'));
      body.appendChild(typing);
      row.appendChild(avatar);
      row.appendChild(body);
      msgsEl.appendChild(row);
    }
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function updateBadges() {
    const n = totalUnread();
    badgeEl.textContent = n > 99 ? '99+' : (n ? String(n) : '');
    badgeEl.style.display = n ? 'flex' : 'none';
    renderContacts();
    if (panelOpen) renderChat();
  }

  /* ============================ 聊天逻辑 ============================ */
  function submitChat() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    inputEl.style.height = 'auto';
    sendUserMessage(text);
  }

  /* ---- 智能回复：调 DeepSeek 官方 API ----
   * 扩展版走 background（chrome.runtime 转发，绕开页面 CORS）；
   * 油猴/普通页面直接 fetch（可能被浏览器 CORS 拦截，失败则退回模板）。 */
  const CONTEXT_TURNS = 10; // 多轮上下文：带上最近 10 条对话

  function callApi(messages, apiKey, model) {
    const key = apiKey || settings.apiKey;
    const mdl = model || settings.model;
    return new Promise(function (resolve) {
      let settled = false;
      const done = function (r) { if (!settled) { settled = true; resolve(r); } };
      const timer = setTimeout(function () { done({ ok: false, error: '请求超时（30秒）' }); }, 30000);
      try {
        if (window.chrome && chrome.runtime && chrome.runtime.id) {
          chrome.runtime.sendMessage({ type: 'dsm_chat', apiKey: key, model: mdl, messages: messages }, function (resp) {
            clearTimeout(timer);
            if (chrome.runtime.lastError) { done({ ok: false, error: chrome.runtime.lastError.message }); return; }
            done(resp || { ok: false, error: '无响应' });
          });
        } else {
          fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
            body: JSON.stringify({ model: mdl, messages: messages, max_tokens: 200, temperature: 0.9 })
          }).then(function (r) {
            clearTimeout(timer);
            return r.json().then(function (j) { return { ok: r.ok, status: r.status, json: j }; });
          }).then(function (x) {
            if (x.ok && x.json && x.json.choices && x.json.choices[0] && x.json.choices[0].message) {
              done({ ok: true, text: x.json.choices[0].message.content });
            } else {
              const err = (x.json && x.json.error && x.json.error.message) || ('HTTP ' + x.status);
              done({ ok: false, error: err });
            }
          }).catch(function (e) {
            clearTimeout(timer);
            done({ ok: false, error: String((e && e.message) || e) });
          });
        }
      } catch (e) {
        clearTimeout(timer);
        done({ ok: false, error: String((e && e.message) || e) });
      }
    });
  }

  /* 聊天风格指令：让回复像微信日常聊天（多条短消息 + 主动反问） */
  const SMART_STYLE = '\n\n【聊天方式】像微信日常聊天：1) 回复通常分成 1~3 条短消息，每条一句话、一般不超过 25 字，每条单独一行（用换行分隔）；2) 不要总是长篇大论一口气说完；3) 不要只顾回答，要主动一点——大约一半的回复要以一个问题结尾或反问对方，让对话能继续下去；4) 始终符合你的人物设定语气。';

  /* 构建多轮上下文消息：人设 + 聊天风格 + 最近对话 + 当前句 */
  function buildSmartMessages(charId, text) {
    const msgs = [{ role: 'system', content: charPrompt(charId) + SMART_STYLE }];
    const convo = state.convos[charId] || { messages: [] };
    let history = convo.messages;
    // 若最后一条正是当前要发的话，去掉避免重复
    const last = history[history.length - 1];
    if (last && last.from === 'user' && last.text === text) history = history.slice(0, -1);
    history = history.slice(-CONTEXT_TURNS);
    history.forEach(function (m) {
      if (m.from === 'user') msgs.push({ role: 'user', content: m.text });
      else if (m.from === 'char') msgs.push({ role: 'assistant', content: m.text });
    });
    msgs.push({ role: 'user', content: text });
    return msgs;
  }

  function callSmartReply(charId, text, apiKey, model) {
    return callApi(buildSmartMessages(charId, text), apiKey, model);
  }

  /* 智能邮件：等 AI 时按场景让角色发一条消息（智能回复开启时用） */
  function generateSmartEmail(charId, userText, category) {
    const ch = getChar(charId) || CHARACTERS.sister;
    const scene = category === 'waiting'
      ? '用户正在等待 AI 回复，等得有点无聊，正在等你（' + ch.name + '）发来一条消息。'
      : '用户刚刚给 AI 发送了：「' + String(userText || '').slice(0, 80) + '」，正在等待回复。';
    const messages = [
      {
        role: 'system',
        content: charPrompt(charId) +
          '\n现在请你以' + ch.name + '的身份，主动给用户发一条简短的「邮件」消息，' +
          '内容要贴合当前场景，语气完全符合你的人设，不超过 60 字，可以带 emoji。'
      },
      { role: 'user', content: scene + '请直接发消息内容，不要解释。' }
    ];
    return callApi(messages);
  }

  /* 多条发送：回复含换行时按行拆成短消息，间隔发出（更像微信日常聊天） */
  function deliverMulti(charId, reply) {
    const parts = String(reply).split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!parts.length) parts.push(String(reply));
    if (parts.length > 4) {
      // 最多 4 条，多出来的合并进最后一条
      parts.splice(3, parts.length - 3, parts.slice(3).join('\n'));
    }
    parts.forEach(function (p, i) {
      setTimeout(function () {
        if (!state.enabled) return;
        pushMessage(charId, 'char', p);
        save();
        renderChat();
      }, i * 500);
    });
  }

  function sendUserMessage(text) {
    const charId = state.active;
    pushMessage(charId, 'user', text);
    save();
    renderChat();
    state.typingChar = charId;
    renderChat();
    const doneReply = function (reply) {
      state.typingChar = null;
      save();
      renderChat();
      deliverMulti(charId, reply);
    };
    if (settings.smart && settings.apiKey) {
      const t0 = Date.now();
      callSmartReply(charId, text).then(function (r) {
        if (r.ok && r.text) {
          const wait = Math.max(0, 900 - (Date.now() - t0));
          setTimeout(function () { doneReply(r.text.trim()); }, wait);
        } else {
          if (!smartWarned) {
            smartWarned = true;
            showToast('⚠️ 智能回复没连上，先退回模板聊天：' + r.error);
          }
          setTimeout(function () { doneReply(generateReply(charId, text)); }, randInt(700, 1900));
        }
      });
    } else {
      setTimeout(function () { doneReply(generateReply(charId, text)); }, randInt(700, 1900));
    }
  }

  /* ============================ 开关 ============================ */
  function setEnabled(on) {
    state.enabled = on;
    save();
    toggleBtn.classList.toggle('dsm-on', on);
    toggleBtn.classList.toggle('dsm-dim', !on);
    mailBtn.classList.toggle('dsm-dim', !on);
    if (!on) closePanel();
    showToast(on ? '🐳 鲸鱼邮箱已开启，等 AI 回话时邮件就会游过来啦~' : '💤 鲸鱼邮箱已关闭');
  }

  /* ============================ 提示气泡 ============================ */
  function showToast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    const r = dock.getBoundingClientRect();
    toastEl.style.top = Math.min(r.top + 6, window.innerHeight - 50) + 'px';
    toastEl.style.right = (window.innerWidth - r.right + 62) + 'px';
    toastEl.classList.add('dsm-show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('dsm-show'); }, CONFIG.toastDuration);
  }

  /* ============================ 演示模式 ============================ */
  const DEMO_SAMPLES = [
    '帮我写一个 Python 爬虫，抓取天气数据',
    '今天上班好累啊，不想动了',
    '为什么天空是蓝色的呀？',
    '哈哈今天中奖了，超开心！',
    '你帮我解释一下什么是量子纠缠'
  ];

  function setupDemo() {
    const btn = el('button', 'dsm-btn');
    btn.title = '模拟：等 AI 回复时收到一封邮件';
    btn.textContent = '🧪';
    btn.style.fontSize = '19px';
    btn.addEventListener('click', function () {
      const sample = pick(DEMO_SAMPLES);
      scheduleEmailFromAI(sample);
      showToast('🧪 已模拟你发送：「' + (sample.length > 12 ? sample.slice(0, 12) + '…' : sample) + '」');
    });
    dock.appendChild(btn);
    // 自动演示：打开页面 1 秒后先“收到”一封邮件
    setTimeout(function () {
      if (!state.enabled) return;
      deliverEmail('sister', pick(CHARACTERS.sister.emails.waiting));
    }, 1000);
  }

  /* ============================ 初始化 ============================ */
  function initUI() {
    // 重建界面（可重复调用；页面清掉我们的图标后自动修复）
    if (root) { try { root.remove(); } catch (e) {} }
    root = null; dock = null; mailBtn = null; badgeEl = null; toggleBtn = null;
    panelEl = null; msgsEl = null; inputEl = null; sendBtn = null; toastEl = null;
    contactsEl = null; contactsFadeL = null; contactsFadeR = null;
    Object.keys(contactCards).forEach(function (k) { delete contactCards[k]; });
    panelOpen = false;
    buildRoot();
    buildDock();
    buildPanel();
    buildToast();
    applyTheme();
    updateBadges();
    markBooted();
    if (!state.enabled) {
      toggleBtn.classList.remove('dsm-on');
      mailBtn.classList.add('dsm-dim');
    }
  }

  function startSelfHeal() {
    // 单页应用（如 DeepSeek Harness）晚挂载时会重建页面、清掉我们的图标，
    // 这里监视 body：一旦 #dsm-root 消失就立即重建，保证图标一直在。
    let pending = null;
    function heal() {
      try {
        if (document.body && !document.getElementById('dsm-root')) {
          const wasOpen = panelOpen;
          initUI();
          try { selfObs.observe(document.body, { childList: true }); } catch (e) {}
          if (wasOpen) openPanel(); // 面板开着时被重建，恢复打开状态
        }
      } catch (e) {}
    }
    const selfObs = new MutationObserver(function () {
      // 防抖：页面频繁改动时不反复重建
      clearTimeout(pending);
      pending = setTimeout(heal, 150);
    });
    try { selfObs.observe(document.body, { childList: true }); } catch (e) {}
    try { selfObs.observe(document.documentElement, { childList: true }); } catch (e) {}
  }

  /* 全局事件（只挂一次，避免面板重建后重复叠加导致误关） */
  function attachGlobalEvents() {
    document.addEventListener('pointerdown', function (e) {
      if (!panelOpen) return;
      if (root && root.contains(e.target)) return;
      // 容忍面板周边小范围点击（含图标、间隙），避免误关
      try {
        const r = panelEl.getBoundingClientRect();
        const pad = 28;
        if (e.clientX >= r.left - pad && e.clientX <= r.right + pad &&
            e.clientY >= r.top - pad && e.clientY <= r.bottom + pad) return;
      } catch (err) {}
      closePanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (settingsPane && settingsPane.classList.contains('dsm-show')) {
          settingsPane.classList.remove('dsm-show');
        } else if (panelOpen) {
          closePanel();
        }
      }
    });
    // 窗口缩放后面板重新定位
    window.addEventListener('resize', function () {
      if (panelOpen) positionPanel();
    });
  }

  function init() {
    if (window.__DSM_MAILBOX__) return; // 防重复注入
    injectStyles();
    initUI();

    // 跟随页面深浅色切换（一次性全局监听）
    try {
      new MutationObserver(applyTheme).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
      });
    } catch (e) {}

    startWatcher();
    startSelfHeal();
    attachGlobalEvents();

    // 调试/扩展钩子
    window.__DSM_MAILBOX__ = {
      version: CONFIG.version,
      state: state,
      settings: settings,
      characters: CHARACTERS,
      getChars: getAllChars,
      getChar: getChar,
      charPrompt: charPrompt,
      addCustomChar: addCustomChar,
      generateReply: generateReply,
      buildSmartMessages: buildSmartMessages,
      deliverEmail: deliverEmail,
      scheduleEmail: scheduleEmailFromAI,
      openPanel: openPanel,
      closePanel: closePanel,
      rebuildUI: initUI
    };
    // eslint-disable-next-line no-console
    console.log('[鲸鱼邮箱] 已加载 v' + CONFIG.version + (isDemo() ? '（演示模式）' : ''));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* =====================================================================
   * 如何新增角色（例如一只海龟哥哥）：
   * 1. 在 CHARACTERS 里加一个 key（如 turtle），照 sister/brother 的结构写：
   *    - replies：聊天的回复池（键为意图名，见 INTENT_RULES，另加 fallback）
   *    - emails：等待 AI 时收到的邮件池（键为 waiting/question/code/study/emotion/generic）
   * 2. 在 loadState 的默认初始化处（['sister','brother']）把 'turtle' 加进去
   * 3. 在 buildPanel 的联系人列表 ['sister','brother'] 里加上 'turtle'
   * 4. 如果想在邮件里随机到新角色，把 scheduleEmailFromAI 里的
   *    pick(['sister','brother']) 也加上 'turtle'
   * 提示：回复池尽量每类 2~4 条，随机起来才不会腻。
   * ===================================================================== */
})();
