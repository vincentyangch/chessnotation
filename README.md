# Chess Toolbox

A web app for digitizing chess games from handwritten notation sheets and board images. Scan, review, analyze with Stockfish, and export to Lichess — all in one place.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Notation Analyzer** — Upload photos of handwritten or printed score sheets. AI extracts moves and metadata automatically, then you review each move one by one.
- **Board Scanner** — Upload a photo of a chessboard (or a page with multiple diagrams) and get the FEN position instantly.
- **Stockfish Analysis** — Local engine evaluation with configurable depth. See the best move and position assessment after every move.
- **Lichess Export** — Send your transcribed game or scanned position directly to a Lichess study.
- **Multi-provider AI** — Supports Google Gemini, OpenAI, and Anthropic Claude. Switch providers with a single environment variable.

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd ChessNotation
npm install
```

### 2. Configure environment

Copy the template and fill in your API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
AI_PROVIDER=gemini
AI_API_KEY="your-api-key-here"
```

See [AI Provider Setup](#ai-provider-setup) below for details on getting a key.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## AI Provider Setup

Chess Toolbox needs an AI vision API to parse images. Pick any one of the three supported providers.

| Provider | Default Model | Get an API Key |
|----------|--------------|----------------|
| **Gemini** | `gemini-2.5-flash` | [Google AI Studio](https://aistudio.google.com/apikey) — free tier available |
| **OpenAI** | `gpt-4o` | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **Claude** | `claude-sonnet-4-20250514` | [Anthropic Console](https://console.anthropic.com/settings/keys) |

Set these in `.env.local`:

```env
AI_PROVIDER=gemini          # gemini | openai | claude
AI_API_KEY="your-key"       # API key for the selected provider
AI_MODEL=                   # (Optional) Override the default model
```

> **Tip:** Gemini's free tier is a good starting point. For best accuracy on messy handwriting, try `gemini-2.5-flash` or `gpt-4o`.

## Lichess Token Setup

To export games directly to your Lichess studies:

1. Go to [lichess.org/account/oauth/token](https://lichess.org/account/oauth/token)
2. Create a new personal access token
3. Enable the **Study read** and **Study write** scopes
4. Copy the token and add it to `.env.local`:

```env
LICHESS_TOKEN="lip_xxxxxxxxxxxxxxxxxxxxx"
```

You can also paste the token into the Lichess Integration section of the in-app Settings modal — but `.env.local` is recommended so it persists across browsers.

## Usage Guide

### Transcribing a Notation Sheet

1. Open the **Notation Analyzer** tab
2. Click **Upload Photo** and select an image of a chess score sheet
3. The AI will parse all moves and show them in a review panel
4. For each move, you can:
   - **Accept** — play the move on the board and advance
   - **Skip** — discard this move and go to the next
   - **Prev** — go back and re-review the previous move
5. If the notation spans multiple pages, click **Upload Next Page** after finishing the first
6. Edit game metadata (players, event, date) in the header area
7. Export the finished PGN to Lichess or copy/download it

### Fixing Incorrect or Missed Moves

AI parsing is not perfect, especially with messy handwriting. Here's how to handle errors:

**If a move is wrong:**
- When reviewing, if the suggested move doesn't look right, click **Skip** to discard it.
- Then play the correct move manually by dragging the piece on the board.
- Continue accepting the remaining parsed moves as normal.

**If a move was missed:**
- The AI may skip a move entirely (e.g., misread two moves as one).
- **Skip** the incorrectly merged move, then manually play both individual moves on the board by dragging pieces.
- Resume accepting parsed moves from where they line up again.

**If the move order is wrong:**
- Click **Prev** to revert back to before the incorrect move.
- Manually play the moves in the correct order.
- Then continue accepting from the next correct parsed move.

**If notation is ambiguous:**
- For example: "Nd2" when both knights can go to d2, or a piece letter that looks like a pawn move.
- Skip the ambiguous move and make the correct one on the board. The board enforces legal moves only, so you'll know immediately if a move is valid.

> **Tip:** Enable Stockfish analysis in Settings. The engine evaluation helps you spot incorrect transcriptions — if the eval suddenly swings wildly after a move, the transcription might be wrong.

### Scanning Board Positions

**Single board:**
1. Open the **Board Scanner** tab
2. Click **Scan Single Board**
3. Select an image containing one chessboard
4. The position loads automatically — copy the FEN or export to Lichess

**Multiple boards (e.g., a textbook page):**
1. Click **Scan Multiple Boards**
2. The AI first detects all board locations (Phase 1), then parses each position in parallel (Phase 2)
3. Click any detected board to load its position
4. Use the piece toolbar to make corrections if needed

### Board Editor

The Board Scanner tab includes a full board editor:
- Select a piece type from the toolbar and click squares to place it
- Use the **trash tool** to remove pieces
- Switch to **Move Only** mode to drag pieces normally
- **Start Position** resets to the standard opening setup
- **Clear Board** empties everything

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── parse-image/     # Notation sheet → moves + metadata
│   │   ├── parse-board/     # Board image → FEN
│   │   ├── parse-boards/    # Multi-board detection
│   │   ├── analyze/         # Stockfish analysis endpoint
│   │   └── lichess/         # Lichess API proxy routes
│   └── page.tsx             # Main app shell + settings modal
├── components/
│   ├── AnalysisBoard.tsx    # Notation analyzer tab
│   ├── BoardScanner.tsx     # Board scanner tab
│   └── LichessExportModal.tsx
├── hooks/
│   ├── useChessGame.ts      # Chess game state management
│   ├── useImageParser.ts    # Image upload + AI parsing
│   └── useSettings.ts       # LocalStorage settings
├── lib/
│   └── ai-provider.ts       # Multi-provider AI abstraction
├── prompts/                  # AI prompt templates + JSON schemas
└── utils/                    # FEN manipulation, image compression
```

## Tech Stack

- **Framework:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS
- **Chess:** chess.js, react-chessboard
- **AI Vision:** Google Gemini / OpenAI / Anthropic Claude
- **Engine:** Stockfish (runs locally in-browser)
- **Export:** Lichess API

## License

MIT
