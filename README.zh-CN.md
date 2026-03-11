# Chess Toolbox（棋局工具箱）

一款用于将手写棋谱和棋盘图片数字化的 Web 应用。扫描、校对、用 Stockfish 分析，并导出到 Lichess——一站式完成。

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

## 功能特性

- **棋谱分析器** — 上传手写或打印棋谱照片，AI 自动提取着法和元数据，然后逐步校对每一步。
- **棋盘扫描器** — 上传棋盘照片（或包含多个棋盘的页面），即刻获取 FEN 局面。
- **Stockfish 分析** — 本地引擎评估，可调节搜索深度。每一步棋后实时显示最佳着法和局面评价。
- **Lichess 导出** — 将转录的棋局或扫描的局面直接发送到 Lichess 研究。
- **多 AI 提供商** — 支持 Google Gemini、OpenAI 和 Anthropic Claude，通过一个环境变量即可切换。

## 快速开始

### 1. 克隆并安装

```bash
git clone <仓库地址>
cd ChessNotation
npm install
```

### 2. 配置环境变量

复制模板文件并填入你的 API 密钥：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
AI_PROVIDER=gemini
AI_API_KEY="你的-api-密钥"
```

获取密钥的详细说明请参见下方 [AI 提供商配置](#ai-提供商配置)。

### 3. 启动

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## AI 提供商配置

Chess Toolbox 需要 AI 视觉 API 来解析图片。从以下三个提供商中任选其一。

| 提供商 | 默认模型 | 获取 API 密钥 |
|--------|----------|--------------|
| **Gemini** | `gemini-2.5-flash` | [Google AI Studio](https://aistudio.google.com/apikey) — 有免费额度 |
| **OpenAI** | `gpt-4o` | [OpenAI 平台](https://platform.openai.com/api-keys) |
| **Claude** | `claude-sonnet-4-20250514` | [Anthropic 控制台](https://console.anthropic.com/settings/keys) |

在 `.env.local` 中设置：

```env
AI_PROVIDER=gemini          # gemini | openai | claude
AI_API_KEY="你的密钥"        # 所选提供商的 API 密钥
AI_MODEL=                   # （可选）覆盖默认模型
```

> **提示：** Gemini 的免费额度适合入门。对于潦草手写字迹，`gemini-2.5-flash` 或 `gpt-4o` 识别效果较好。

## Lichess 令牌配置

要将棋局直接导出到你的 Lichess 研究：

1. 访问 [lichess.org/account/oauth/token](https://lichess.org/account/oauth/token)
2. 创建一个新的个人访问令牌
3. 启用 **Study read**（研究读取）和 **Study write**（研究写入）权限
4. 复制令牌并添加到 `.env.local`：

```env
LICHESS_TOKEN="lip_xxxxxxxxxxxxxxxxxxxxx"
```

你也可以在应用内设置弹窗的「Lichess 集成」部分粘贴令牌，但推荐使用 `.env.local` 以便跨浏览器持久保存。

## 使用指南

### 转录棋谱

1. 打开 **Notation Analyzer**（棋谱分析器）标签页
2. 点击 **Upload Photo**（上传照片），选择一张棋谱图片
3. AI 将解析所有着法并显示在校对面板中
4. 对于每一步棋，你可以：
   - **Accept**（接受）— 在棋盘上走这步棋并前进到下一步
   - **Skip**（跳过）— 丢弃这步棋，前进到下一步
   - **Prev**（上一步）— 返回上一步重新校对
5. 如果棋谱跨越多页，在完成第一页后点击 **Upload Next Page**（上传下一页）
6. 在顶部区域编辑对局信息（棋手姓名、赛事、日期）
7. 将完成的 PGN 导出到 Lichess 或复制/下载

### 修正错误或遗漏的着法

AI 解析并非完美，尤其是面对潦草手写字迹时。以下是处理各类错误的方法：

**着法识别错误：**
- 校对时，如果建议的着法看起来不对，点击 **Skip**（跳过）丢弃它。
- 然后在棋盘上手动拖动棋子走出正确的着法。
- 之后继续正常接受剩余的解析着法。

**着法被遗漏：**
- AI 可能完全跳过某一步（例如将两步棋误读为一步）。
- **跳过**被错误合并的着法，然后在棋盘上手动走出两步正确的着法。
- 从下一步正确的解析着法处继续接受。

**着法顺序错误：**
- 点击 **Prev**（上一步）回退到错误着法之前。
- 手动按正确顺序走出着法。
- 然后从下一步正确的解析着法处继续接受。

**着法符号不明确：**
- 例如："Nd2"（两个马都能到 d2），或者一个棋子字母看起来像兵的着法。
- 跳过有歧义的着法，在棋盘上走出正确的一步。棋盘只允许合法着法，如果一步棋无效你会立即知道。

> **提示：** 在设置中启用 Stockfish 分析。引擎评估有助于发现错误转录——如果某步棋后评估值突然大幅波动，说明该转录可能有误。

### 扫描棋盘局面

**单个棋盘：**
1. 打开 **Board Scanner**（棋盘扫描器）标签页
2. 点击 **Scan Single Board**（扫描单个棋盘）
3. 选择一张包含棋盘的图片
4. 局面自动加载——复制 FEN 或导出到 Lichess

**多个棋盘（如教科书页面）：**
1. 点击 **Scan Multiple Boards**（扫描多个棋盘）
2. AI 先检测所有棋盘位置（第一阶段），然后并行解析每个局面（第二阶段）
3. 点击任意已检测的棋盘加载其局面
4. 如有需要，使用棋子工具栏进行修正

### 棋盘编辑器

棋盘扫描器标签页包含完整的棋盘编辑器：
- 从工具栏选择棋子类型和颜色，点击格子放置
- 使用 **trash tool**（删除工具）移除棋子
- 切换到 **Move Only**（仅移动）模式进行正常拖放
- **Start Position**（初始局面）重置为标准开局摆放
- **Clear Board**（清空棋盘）移除所有棋子

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── parse-image/     # 棋谱图片 → 着法 + 元数据
│   │   ├── parse-board/     # 棋盘图片 → FEN
│   │   ├── parse-boards/    # 多棋盘检测
│   │   ├── analyze/         # Stockfish 分析接口
│   │   └── lichess/         # Lichess API 代理路由
│   └── page.tsx             # 主应用外壳 + 设置弹窗
├── components/
│   ├── AnalysisBoard.tsx    # 棋谱分析器标签页
│   ├── BoardScanner.tsx     # 棋盘扫描器标签页
│   └── LichessExportModal.tsx
├── hooks/
│   ├── useChessGame.ts      # 棋局状态管理
│   ├── useImageParser.ts    # 图片上传 + AI 解析
│   └── useSettings.ts       # LocalStorage 设置
├── lib/
│   └── ai-provider.ts       # 多提供商 AI 抽象层
├── prompts/                  # AI 提示词模板 + JSON Schema
└── utils/                    # FEN 操作、图片压缩
```

## 技术栈

- **框架：** Next.js 16、React 19、TypeScript
- **样式：** Tailwind CSS
- **国际象棋：** chess.js、react-chessboard
- **AI 视觉：** Google Gemini / OpenAI / Anthropic Claude
- **引擎：** Stockfish（本地浏览器内运行）
- **导出：** Lichess API

## 许可证

MIT
