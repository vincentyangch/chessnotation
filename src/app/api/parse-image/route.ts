import { NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai-provider';
import { getParseImagePrompt, getParseImageSchema } from '@/prompts/parseImage';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64, mimeType = "image/jpeg", fastMode = false } = body;

        if (!imageBase64) {
            return NextResponse.json({ error: "No imageBase64 provided." }, { status: 400 });
        }

        const provider = getAIProvider();
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const responseText = await provider.generate({
            systemPrompt: getParseImagePrompt(fastMode),
            userText: "Extract the moves from this chess notation sheet.",
            image: { base64: cleanBase64, mimeType },
            temperature: 0.1,
            jsonSchema: getParseImageSchema(fastMode),
        });

        try {
            const parsedData = JSON.parse(responseText || "{}");
            if (!parsedData.moves || !Array.isArray(parsedData.moves)) {
                throw new Error("Response does not contain a valid moves array");
            }
            return NextResponse.json({ metadata: parsedData.metadata, moves: parsedData.moves });
        } catch (jsonError: unknown) {
            console.error("Failed to parse AI response as JSON:", responseText);
            return NextResponse.json({ error: "Failed to parse moves from the image. AI did not return valid JSON.", rawText: responseText }, { status: 500 });
        }

    } catch (error: unknown) {
        let errorMessage = "Unknown error";
        if (error instanceof Error) errorMessage = error.message;
        console.error("Parse Image Error:", error);
        return NextResponse.json({ error: "Internal server error parsing image.", details: errorMessage }, { status: 500 });
    }
}
