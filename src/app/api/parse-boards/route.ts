import { NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai-provider';
import { detectBoardsPrompt, detectBoardsSchema } from '@/prompts/parseMultipleBoards';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64, mimeType = "image/jpeg" } = body;

        if (!imageBase64) {
            return NextResponse.json({ error: "No imageBase64 provided." }, { status: 400 });
        }

        const provider = getAIProvider();
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const responseText = await provider.generate({
            systemPrompt: detectBoardsPrompt,
            userText: "Find all chessboards in this image. Return their bounding box locations and any labels/captions near them. Do NOT parse the positions.",
            image: { base64: cleanBase64, mimeType },
            temperature: 0.1,
            jsonSchema: detectBoardsSchema,
        });

        try {
            const parsedData = JSON.parse(responseText || "{}");
            if (!parsedData.boards || !Array.isArray(parsedData.boards)) {
                throw new Error("Response does not contain a valid boards array");
            }
            return NextResponse.json({ boards: parsedData.boards });
        } catch {
            console.error("Failed to parse AI response as JSON:", responseText);
            return NextResponse.json({ error: "Failed to detect boards. AI did not return valid JSON.", rawText: responseText }, { status: 500 });
        }

    } catch (error: unknown) {
        let errorMessage = "Unknown error";
        if (error instanceof Error) errorMessage = error.message;
        console.error("Detect Boards Error:", error);
        return NextResponse.json({ error: "Internal server error detecting boards.", details: errorMessage }, { status: 500 });
    }
}
