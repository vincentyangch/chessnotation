import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64, mimeType = "image/jpeg", apiKey: reqApiKey, model = "gemini-3-flash-preview" } = body;

        const apiKey = reqApiKey || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY environment variable is missing and no API key provided in request." }, { status: 500 });
        }

        if (!imageBase64) {
            return NextResponse.json({ error: "No imageBase64 provided." }, { status: 400 });
        }

        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `You are an expert chess arbiter and computer vision system.
Your task is to transcribe an image of a chessboard (could be a physical board, digital board, or a book diagram) into a Forsyth-Edwards Notation (FEN) string.

Rules:
1. Carefully scan the board from top-left (a8) to bottom-right (h1).
2. White pieces are denoted by uppercase letters (P, N, B, R, Q, K).
3. Black pieces are denoted by lowercase letters (p, n, b, r, q, k).
4. Empty squares are denoted by numbers 1-8 representing consecutive empty squares.
5. Rows are separated by a slash (/).
6. Since we only see the board and not the game history, always append " w - - 0 1" to represent White to move, no castling rights, no en passant target, 0 half-move clock, and move number 1.
7. Return a precise FEN string.

Return ONLY a valid JSON object matching the requested schema.`;

        const responseSchema: Schema = {
            type: Type.OBJECT,
            description: "The parsed chess position.",
            properties: {
                fen: {
                    type: Type.STRING,
                    description: "The complete Forsyth-Edwards Notation (FEN) string representing the board position shown in the image, e.g., 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1'"
                }
            },
            required: ["fen"]
        };

        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const response = await ai.models.generateContent({
            model: model,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { data: cleanBase64, mimeType } },
                        { text: "Extract the FEN notation from this chess board." }
                    ]
                }
            ],
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.1, // Low temperature for factual transcription
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        const responseText = response.text || "{}";

        try {
            const parsedData = JSON.parse(responseText);
            if (!parsedData.fen) {
                throw new Error("FEN not found in response");
            }
            return NextResponse.json({ fen: parsedData.fen });
        } catch (jsonError: unknown) {
            console.error("Failed to parse Gemini response as JSON:", responseText);
            return NextResponse.json({ error: "Failed to parse FEN from the image. Gemini did not return a valid FEN JSON.", rawText: responseText }, { status: 500 });
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
