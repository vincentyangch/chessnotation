import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getParseImagePrompt, getParseImageSchema } from '@/prompts/parseImage';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64, mimeType = "image/jpeg", fastMode = false, apiKey: reqApiKey, model = "gemini-3-flash-preview", currentPgn = "" } = body;

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
                        { text: "Extract the moves from this chess notation sheet." }
                    ]
                }
            ],
            config: {
                systemInstruction: getParseImagePrompt(fastMode),
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: getParseImageSchema(fastMode),
            }
        });

        const responseText = response.text || "{}";

        try {
            const parsedData = JSON.parse(responseText);
            if (!parsedData.moves || !Array.isArray(parsedData.moves)) {
                throw new Error("Response does not contain a valid moves array");
            }
            return NextResponse.json({ metadata: parsedData.metadata, moves: parsedData.moves });
        } catch (jsonError: unknown) {
            console.error("Failed to parse Gemini response as JSON:", responseText);
            return NextResponse.json({ error: "Failed to parse moves from the image. Gemini did not return valid JSON.", rawText: responseText }, { status: 500 });
        }

    } catch (error: unknown) {
        let errorMessage = "Unknown error";
        if (error instanceof Error) errorMessage = error.message;
        console.error("Parse Image Error:", error);
        return NextResponse.json({ error: "Internal server error parsing image.", details: errorMessage }, { status: 500 });
    }
}
