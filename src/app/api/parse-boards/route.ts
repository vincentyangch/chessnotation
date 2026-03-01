import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { detectBoardsPrompt, detectBoardsSchema } from '@/prompts/parseMultipleBoards';

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
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const response = await ai.models.generateContent({
            model: model,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { data: cleanBase64, mimeType } },
                        { text: "Find all chessboards in this image. Return their bounding box locations and any labels/captions near them. Do NOT parse the positions." }
                    ]
                }
            ],
            config: {
                systemInstruction: detectBoardsPrompt,
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: detectBoardsSchema,
            }
        });

        const responseText = response.text || "{}";

        try {
            const parsedData = JSON.parse(responseText);
            if (!parsedData.boards || !Array.isArray(parsedData.boards)) {
                throw new Error("Response does not contain a valid boards array");
            }
            return NextResponse.json({ boards: parsedData.boards });
        } catch {
            console.error("Failed to parse Gemini response as JSON:", responseText);
            return NextResponse.json({ error: "Failed to detect boards. Gemini did not return valid JSON.", rawText: responseText }, { status: 500 });
        }

    } catch (error: unknown) {
        let errorMessage = "Unknown error";
        if (error instanceof Error) errorMessage = error.message;
        console.error("Detect Boards Error:", error);
        return NextResponse.json({ error: "Internal server error detecting boards.", details: errorMessage }, { status: 500 });
    }
}
