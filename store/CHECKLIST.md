# 微软 Edge 扩展商店 · 提交清单

> 逐项填好，就能提交审核。

## 一、提交包

打包文件：`whale-mailbox-v0.1.0.zip`（内容为 `extension/` 下的 manifest.json、content.js、background.js、icon16/32/48/128.png，**manifest.json 位于压缩包根目录**）

## 二、商店信息填写（可直接复制）

| 项目 | 内容 |
| --- | --- |
| **名称** | 鲸鱼邮箱 · DeepSeek 聊天小助手 |
| **短描述** | 等待 DeepSeek 回复时，收到鲸鱼小伙伴发来的邮件，可像微信一样聊天，支持自定义角色与 AI 智能回复 |
| **详细描述** | 见下方「详细描述文案」 |
| **类别** | 生产力（生产工具） |
| **商店 Logo** | `store/icon300.png`（300×300） |
| **小推广图** | 440×280 PNG（可选，需自行制作） |
| **截图** | 至少 1 张（640×400 或 1280×800） |
| **隐私政策 URL** | `https://github.com/mzx-sys/DSH_chat/blob/main/store/PRIVACY.md`（需先把代码推到 GitHub 才能生效） |
| **支持邮箱** | 填写你的邮箱 |

### 详细描述文案

```
在 DeepSeek 页面上悬浮一个邮箱图标和一个开关图标。当你给 AI 发消息、等待回复的这段时间里，
邮箱会收到来自海底小伙伴的「邮件」；点开邮箱就是一个微信风格的聊天窗，可以选性格、可以直接对话。

✨ 功能特性
· 等待即来信：监测到你在等 AI 回复，随机一位小伙伴发来邮件
· 微信式聊天窗：气泡、时间戳、日期分隔线、正在输入动画，玻璃拟态风格
· 内置两位角色：🐳 小鲸娘（爱撒娇）、🐬 小鲸夜（小淘气）
· 本地模板回复引擎：关键词识别意图，离线可用
· 智能回复（可选）：接入 DeepSeek 官方 API，鲸鱼按人设真正「听懂」你说话
· 自定义角色：设置里可改人设、新增角色（名字 + 头像 + 性格背景提示词）

支持 DeepSeek 网页版（chat.deepseek.com）和 DeepSeek Harness 本地界面。
聊天记录、开关状态、角色设置全部保存在本地浏览器，不经过任何第三方。
```

## 三、权限说明（审核时填写）

| 权限 | 用途 |
| --- | --- |
| `chat.deepseek.com` / `www.deepseek.com` | 仅在 DeepSeek 页面注入插件界面 |
| `127.0.0.1` / `localhost` | 支持 DeepSeek Harness 本地界面 |
| `api.deepseek.com` | 智能回复时调用 DeepSeek 官方 API |

> 审核可能询问 localhost 权限，建议在「权限说明」里注明：用于支持用户自建的本地 DeepSeek Harness 界面。

## 四、待办清单

- [ ] 注册 [Microsoft Partner Center](https://partner.microsoft.com) 开发者账号
- [ ] 推送代码到 GitHub（让隐私政策 URL 生效）
- [ ] 制作 1~3 张截图（建议：邮箱图标出现、微信式聊天窗、设置面板）
- [ ] （可选）制作 440×280 小推广图
- [ ] 上传 zip → 填写信息 → 提交审核

## 五、常见驳回原因提醒

1. **隐私政策不可用**：确保 GitHub 仓库设为 Public，PRIVACY.md 的 URL 能直接打开
2. **截图与功能不符**：截图需真实展示插件运行界面
3. **权限描述不清**：localhost/api.deepseek.com 权限务必写清楚用途
4. **名称/描述含第三方商标**：「DeepSeek」为第三方名称，建议在描述里注明「非 DeepSeek 官方扩展，由社区开发者维护」
