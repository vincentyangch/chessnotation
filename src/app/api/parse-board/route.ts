import { NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai-provider';
import { parseBoardPrompt, parseBoardSchema } from '@/prompts/parseBoard';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64, mimeType = "image/jpeg", boardHint } = body;

        if (!imageBase64) {
            return NextResponse.json({ error: "No imageBase64 provided." }, { status: 400 });
        }

        const provider = getAIProvider();
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        // Build the user message — include bounding box hint if provided
        let userText = "Output the FEN for this chess board.";
        if (boardHint) {
            const [ymin, xmin, ymax, xmax] = boardHint;
            userText = `Focus on the chessboard in region [ymin=${ymin}, xmin=${xmin}, ymax=${ymax}, xmax=${xmax}] (scaled 0-1000). Output only that board's FEN.`;
        }

        const responseText = await provider.generate({
            systemPrompt: parseBoardPrompt,
            userText,
            image: { base64: cleanBase64, mimeType },
            temperature: 0.1,
            jsonSchema: parseBoardSchema,
        });

        const trimmed = (responseText || "").trim();

        // Try structured JSON first (preferred path)
        const fen = extractFenFromJson(trimmed) || extractFen(trimmed);

        if (fen) {
            return NextResponse.json({ fen });
        } else {
            console.error("Could not extract FEN from response:", trimmed);
            return NextResponse.json({ error: "Failed to extract a valid FEN from the response.", rawText: trimmed }, { status: 500 });
        }

    } catch (error: unknown) {
        let errorMessage = "Unknown error";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        console.error("Parse Board Error:", error);
        return NextResponse.json({ error: "Internal server error parsing board image.", details: errorMessage }, { status: 500 });
    }
}

/**
 * Extract FEN from a structured JSON response (preferred).
 */
function extractFenFromJson(text: string): string | null {
    try {
        const data = JSON.parse(text);
        if (data.fen && typeof data.fen === 'string') {
            return normalizeFen(data.fen.trim());
        }
    } catch {
        // Not valid JSON — fall through to regex extraction
    }
    return null;
}

/**
 * Extract a FEN string from raw text (fallback).
 * Handles cases where the model wraps it in backticks, quotes, or extra text.
 */
function extractFen(text: string): string | null {
    // Remove markdown code fences
    let cleaned = text.replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, '').trim());
    cleaned = cleaned.replace(/`/g, '').trim();

    // Try to match a FEN pattern: pieces/pieces/... followed by optional side-to-move etc.
    const fenRegex = /([rnbqkpRNBQKP1-8]{1,8}\/){7}[rnbqkpRNBQKP1-8]{1,8}(\s+[bw]\s+[KQkq-]+\s+[a-h1-8-]+\s+\d+\s+\d+)?/;
    const match = cleaned.match(fenRegex);

    if (match) {
        return normalizeFen(match[0].trim());
    }

    return null;
}

/**
 * Ensure a FEN string has all six fields.
 * Preserves whatever side-to-move the AI detected instead of always defaulting to white.
 */
function normalizeFen(fen: string): string {
    const parts = fen.split(/\s+/);
    // parts[0] = piece placement (required)
    // parts[1] = side to move
    // parts[2] = castling
    // parts[3] = en passant
    // parts[4] = halfmove clock
    // parts[5] = fullmove number
    if (parts.length < 2) parts.push('w');
    if (parts.length < 3) parts.push('-');
    if (parts.length < 4) parts.push('-');
    if (parts.length < 5) parts.push('0');
    if (parts.length < 6) parts.push('1');
    return parts.slice(0, 6).join(' ');
}
