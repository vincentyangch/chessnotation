import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { parseBoardPrompt } from '@/prompts/parseBoard';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64, mimeType = "image/jpeg", apiKey: reqApiKey, model = "gemini-3-flash-preview", boardHint } = body;

        const apiKey = reqApiKey || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY environment variable is missing and no API key provided in request." }, { status: 500 });
        }

        if (!imageBase64) {
            return NextResponse.json({ error: "No imageBase64 provided." }, { status: 400 });
        }

        const ai = new GoogleGenAI({ apiKey });
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        // Build the user message — include bounding box hint if provided
        let userText = "Output the FEN for this chess board.";
        if (boardHint) {
            const [ymin, xmin, ymax, xmax] = boardHint;
            userText = `Focus on the chessboard in region [ymin=${ymin}, xmin=${xmin}, ymax=${ymax}, xmax=${xmax}] (scaled 0-1000). Output only that board's FEN.`;
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { data: cleanBase64, mimeType } },
                        { text: userText }
                    ]
                }
            ],
            config: {
                systemInstruction: parseBoardPrompt,
                temperature: 0.1,
            }
        });

        const responseText = (response.text || "").trim();

        // Extract FEN from the plain-text response
        // The response should be just a FEN string, but handle edge cases
        const fen = extractFen(responseText);

        if (fen) {
            return NextResponse.json({ fen });
        } else {
            console.error("Could not extract FEN from response:", responseText);
            return NextResponse.json({ error: "Failed to extract a valid FEN from the response.", rawText: responseText }, { status: 500 });
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
 * Extract a FEN string from raw text.
 * Handles cases where the model wraps it in backticks, quotes, or extra text.
 */
function extractFen(text: string): string | null {
    // Remove markdown code fences
    let cleaned = text.replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, '').trim());
    cleaned = cleaned.replace(/`/g, '').trim();

    // Try to match a FEN pattern: pieces/pieces/... followed by side-to-move etc.
    const fenRegex = /([rnbqkpRNBQKP1-8]{1,8}\/){7}[rnbqkpRNBQKP1-8]{1,8}(\s+[bw]\s+[KQkq-]+\s+[a-h1-8-]+\s+\d+\s+\d+)?/;
    const match = cleaned.match(fenRegex);

    if (match) {
        let fen = match[0].trim();
        // If missing the trailing parts (side to move, castling, etc.), append defaults
        if (!fen.includes(' ')) {
            fen += ' w - - 0 1';
        }
        return fen;
    }

    return null;
}
