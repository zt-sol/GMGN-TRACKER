# GMGN 访问追踪 / GMGN  Tracker

> 自动记录你在 **GMGN / Padre / Debot** 上看过的代币，按链筛选、导出 CSV。
>
> Auto-track tokens you've viewed on GMGN, Padre, and Debot. Chain filtering, CSV export.

**作者 / Author:** [Crawford886 (X)](https://x.com/Crawford886)

---

## ✨ 功能 / Features

| 功能 | 说明 |
|------|------|
| 🔍 **自动记录** | 浏览 GMGN / Padre / Debot 代币详情页时，自动记录名称、合约地址、链、来源平台、访问时间 |
| 🔎 **搜索过滤** | 按代币名或合约地址搜索；按链（SOL / BSC / ETH / Base / TRON）筛选 |
| 📥 **CSV 导出** | 一键导出 CSV，方便做进一步分析 |
| 📋 **复制合约** | 点击任意代币行，自动复制合约地址到剪贴板 |
| ✂️ **单条删除** | 每条记录右侧有删除按钮，可单独移除不想要的代币 |
| 💾 **持久存储** | 所有数据存于 `chrome.storage.local`，关闭 popup 或重启浏览器不丢失 |
| 🌗 **暗色主题** | 深色 UI，护眼且与 GMGN 风格一致 |

---

## 📸 截图 / Screenshot

```
┌──────────────────────────────────────────────┐
│ 📜 GMGN 访问追踪                        42  │
├──────────────────────────────────────────────┤
| [搜索代币...]  [📥 CSV] [🗑️] │
├──────────────────────────────────────────────┤
│ 全部  SOL  BSC  ETH  Base  TRON              │
├──────────────────────────────────────────────┤
│ 就绪                         │
├──────────────────────────────────────────────┤
│ PEPE                                   │ GMGN│
│ CAKE                                   │ PADRE│
│ UNI                                    │ DEBOT│
│ ...                                        │
├──────────────────────────────────────────────┤
│ 点击代币复制合约 · 支持 GMGN/Padre/Debot    │
└──────────────────────────────────────────────┘
```

---

## 🚀 安装 / Installation

### 方法一：开发者模式加载（推荐）

1. **克隆或下载** 本仓库到本地
2. 打开 Chrome → 地址栏输入 `chrome://extensions`
3. 右上角开启 **"开发者模式 / Developer mode"**
4. 点击 **"加载已解压的扩展程序 / Load unpacked"**
5. 选择 `token-tracker/` 文件夹

### 方法二：打包安装

```bash
cd token-tracker
zip -r gmgn_tracker.zip *
# → Chrome 扩展管理页 → 拖拽 zip 文件安装
```

---

## 📂 项目结构 / File Structure

```
token-tracker/
├── manifest.json      # Chrome Extension Manifest V3
├── main-hook.js       # 注入 MAIN world 的钩子（优先拦截 SPA 导航）
├── content.js         # 内容脚本（SPA 跳转检测、DOM 解析、消息传递）
├── popup.html         # 弹出窗口 UI（暗色主题）
├── popup.js           # 弹出窗口逻辑（数据加载、导出、过滤）
└── icon.png           # 扩展图标
```

---

## 🧠 技术细节 / Technical Details

### SPA 导航检测（4 重机制）

GMGN / Padre / Debot 都是单页应用（SPA），页面跳转不触发传统 `window.onload`。插件使用 **4 重检测** 确保不遗漏任何代币：

| 机制 | 优先级 | 说明 |
|------|--------|------|
| ① **MutationObserver** | 持续 | 监听 DOM 变化，发现新代币详情元素立即提取 |
| ② **popstate / hashchange** | 事件 | 监听浏览器前进后退 |
| ③ **history.pushState** 拦截 | 优先 | 覆盖 `pushState`，在 URL 变化前预判 |
| ④ **DOM click 扫描** | 兜底 | 扫描页面中现有 `<a>` 标签的合约地址，原生点击触发路由 |

### 数据格式

```json
{
  "name": "PEPE",
  "address": "0x...",
  "chain": "eth",
  "platform": "gmgn",
  "time": 1700000000000
}
```

### 数据来源

| 数据 | 来源 | 说明 |
|------|------|------|
| 代币名称/合约/链 | GMGN / Padre / Debot 页面 DOM | 本地解析，零 API 消耗 |
| 存储 | `chrome.storage.local` | Chrome 内置持久化 |

---

## 🔗 支持平台 / Supported Platforms

| 平台 | 状态 |
|------|------|
| [GMGN.ai](https://gmgn.ai/r/PbbTCXAC?chain=bsc) | ✅ 完整支持 |
| [Padre.gg](https://trade.padre.gg/rk/crawford) | ✅ 完整支持 |
| [Debot.ai](https://inv.debot.ai/r/242413?lang=zh) | ✅ 完整支持 |

---

## 🛠️ 开发 / Development

### 修改后重载

```bash
# 修改任意文件后，在 chrome://extensions 点击扩展的 ↻ 刷新按钮即可
```

### 提交 PR

欢迎提交 Issue 和 PR！目前已知可改进方向：

- [ ] 添加更多链的支持（Arbitrum, Optimism 等）
- [ ] 导出格式支持 JSON
- [ ] 代币分组/标签功能

---

## 📜 License

MIT

---

## 🙋 常见问题 / FAQ

**Q: 数据会丢失吗？**  
A: 所有数据存储在 Chrome 本地，清除浏览器数据或卸载扩展会清除记录。

**Q: 支持 Solana 上的代币吗？**  
A: 支持。GMGN 上的 Solana 代币也会被自动记录，链标签显示为紫色 SOL。
