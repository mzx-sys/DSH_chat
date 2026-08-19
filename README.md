# 🐳 鲸鱼邮箱 · DeepSeek 聊天小助手

在 DeepSeek 页面上悬浮一个 **📧 邮箱图标** 和一个 **开关图标**。当你给 AI 发消息、等待回复的这段时间里，邮箱会收到来自海底小伙伴的「邮件」；点开邮箱就是一个微信风格的聊天窗，可以选性格、可以直接对话。

> 支持 **DeepSeek 网页版**（chat.deepseek.com）和 **DeepSeek Harness 本地界面**（127.0.0.1 / localhost 任意端口）。

## ✨ 功能特性

- **两个悬浮图标**（右下侧，可整组拖拽）：
  - 📧 邮箱：点开下拉微信式聊天窗；有未读时显示红色角标
  - 🔘 开关：一键开启 / 关闭整个邮箱功能（状态记忆，刷新不丢）
- **等待即来信**：监测到你在等 AI 回复，1.5~4 秒后随机一位小伙伴发来邮件，左下角弹提示、图标出现未读红点
- **微信式聊天窗**：绿/灰气泡、时间戳、日期分隔线、「正在输入…」动画；固定高度、内部滚动、玻璃拟态风格
- **内置两位角色**：
  - 🐳 **小鲸娘**：爱撒娇的小女孩，叫你「哥哥」，满嘴波浪号和小表情
  - 🐬 **小鲸夜**：小淘气，爱抬杠爱捣蛋
- **本地模板回复引擎**：关键词识别意图（打招呼/道别/难过/开心/讲笑话/饿/学习/时间…），再按性格随机挑一句，离线可用
- **聊天记录持久化**：存在浏览器 `localStorage`，刷新继续

## 🔮 智能回复（可选，DeepSeek API）

默认鲸鱼用**本地模板**聊天（免费、离线）。想要鲸鱼真正「听懂」你说什么、按人设现编回复，可开启智能回复：

1. 去 [platform.deepseek.com](https://platform.deepseek.com) 创建 **API Key**
2. 打开邮箱 → 点右上角 **⚙️** → 粘贴 API Key → **测试连接** → **保存**
3. 打开 **智能回复** 开关 → 保存

开启后：
- **多轮上下文**：鲸鱼会记住最近 10 条对话，聊天更连贯
- **智能邮件**：等 AI 回复时的邮件也由 AI 按场景现编
- 没填 Key / 调用失败时自动退回模板聊天

> 安全性：API Key 只保存在**本机浏览器**，请求由扩展后台直接发给 DeepSeek 官方接口，不经过任何第三方。

## 🎭 自定义角色人设

⚙️ 设置 → 「🎭 角色人设」区：

- **修改人设**：小鲸娘 / 小鲸夜的提示词（性格、背景、说话风格）可自由编辑
- **新增角色**：点「＋ 新增角色」，填名字、emoji、性格背景提示词 → **确定**，新角色出现在联系人列表
- **兜底话术**：自定义角色可填「没开智能回复时的回复」；留空则提示去设置开启
- **导出 / 导入**：⚙️ 设置 → 角色人设区 → 「📤 导出角色」一键备份/分享角色（含人设、兜底、内置角色覆盖；不含 API Key）；「📥 导入角色」选择 JSON 文件一键恢复
- **导出聊天记录**：聊天窗口标题栏 📤 按钮，把当前角色的对话导出为 Markdown
- **删除**：自定义角色可随时删除（内置角色人设可改、不可删）

## 📦 安装

### 方式一：Chrome 扩展（推荐，免 Tampermonkey）

1. Chrome 打开 `chrome://extensions`
2. 右上角开启 **「开发者模式」**
3. 点左上角 **「加载已解压的扩展程序」**，选择本项目的 **`extension`** 文件夹
4. 打开 [chat.deepseek.com](https://chat.deepseek.com)（或 Harness 本地界面），发条消息，等回复时看右下角 📧 角标～

### 方式二：Tampermonkey 油猴脚本

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)（或 Violentmonkey）
2. 新建脚本，把 [`ds-whale-mailbox.user.js`](./ds-whale-mailbox.user.js) 全文粘贴进去 → 保存

### 方式三：零安装试玩（预览页）

直接打开 [`preview.html`](./preview.html)（自包含，双击即玩），页面会自动收到一封邮件，右下角 🧪 按钮可模拟「等待 AI」场景。

## 🛠️ 开发

```bash
# 构建：由 ds-whale-mailbox.user.js 生成 preview.html 和 extension/
node build.js        # 或 npm run build

# 测试：验证脚本可加载、收信、未读计数、话术池、自定义角色
node smoke-test.js   # 或 npm test
```

- 改脚本只改 `ds-whale-mailbox.user.js`（唯一内容源）
- 改完跑 `node build.js` → `chrome://extensions` 点扩展卡片 **⟳ 刷新** → 页面 **F5**

## 📁 项目结构

```
├── ds-whale-mailbox.user.js   # 插件本体（唯一内容源）
├── build.js                   # 构建脚本：生成 preview.html 和 extension/
├── smoke-test.js              # 冒烟测试
├── preview.html               # 自包含预览页（生成产物，已提交便于直接试玩）
├── extension/                 # Chrome 扩展（生成产物，已提交便于直接加载）
│   ├── manifest.json
│   ├── content.js
│   ├── background.js          # 后台：转发智能回复请求到 DeepSeek API（绕开 CORS）
│   └── icon128.png
├── avatar-sister.jpg          # 小鲸娘头像（128×128，已 base64 内嵌进脚本）
├── package.json
└── LICENSE                    # MIT
```

## ❓ 常见问题

- **装到 DeepSeek 后收不到邮件？** DeepSeek 改版会导致消息结构变化，检查脚本内 `USER_MSG_SELECTORS` / `GENERATING_SELECTORS` 两个选择器数组，按新版页面结构更新。
- **智能回复连不上？** 预览页/油猴版受浏览器 CORS 限制，智能回复请用 **Chrome 扩展版**（后台转发）。
- **头像怎么换？** 替换 `avatar-sister.jpg` 后把 base64 重新注入脚本（或提 issue）。

## 📄 License

[MIT](./LICENSE) © 2026 鲸鱼邮箱项目作者
