import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export const runtime = 'nodejs'; // Use nodejs for larger payloads if needed, or edge
export const maxDuration = 60; // Allow more time for Gemini to process the image

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64, mimeType = "image/jpeg", fastMode = false, apiKey: reqApiKey, model = "gemini-3-flash-preview" } = body;

        const apiKey = reqApiKey || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY environment variable is missing and no API key provided in request." }, { status: 500 });
        }

        if (!imageBase64) {
            return NextResponse.json({ error: "No imageBase64 provided." }, { status: 400 });
        }

        const ai = new GoogleGenAI({ apiKey });

        const baseInstructions = `You are an expert chess arbiter and game transcriber with spatial reasoning capabilities. 
Your task is to transcribe a handwritten or printed chess notation sheet into a JSON object.
Follow these exact rules:
1. Examine the image carefully. Extract any visible metadata from the top headers of the score sheet, such as Event Name, Date, Round Number, White Player Name, and Black Player Name.
2. Read the moves sequentially from move 1 to the end.
3. Fix obvious OCR/handwriting errors (e.g., '0-0' vs 'O-O', recognizing pieces if context demands it).`;

        const boxInstructions = `
4. Return ONLY a valid JSON object with {"metadata": {...}, "moves": [...]}. Each move object must have a "move" string and a "box" array of exactly 4 numeric values [ymin, xmin, ymax, xmax] mapped between 0 and 1000 proportional to the image.`;

        const fastInstructions = `
4. Return ONLY a valid JSON object with {"metadata": {...}, "moves": [...]}. Each move object must have a "move" string.`;

        const systemInstruction = baseInstructions + (fastMode ? fastInstructions : boxInstructions);

        // Define the schema
        const responseSchema: Schema = {
            type: Type.OBJECT,
            description: "Chess game transcription including metadata and moves.",
            properties: {
                metadata: {
                    type: Type.OBJECT,
                    description: "Game metadata extracted from the score sheet header. Provide empty strings if not found.",
                    properties: {
                        event: { type: Type.STRING, description: "Event Name" },
                        date: { type: Type.STRING, description: "Date (YYYY.MM.DD) or as written" },
                        round: { type: Type.STRING, description: "Round Number" },
                        white: { type: Type.STRING, description: "White Player Name" },
                        black: { type: Type.STRING, description: "Black Player Name" }
                    }
                },
                moves: {
                    type: Type.ARRAY,
                    description: "List of chess moves.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            move: {
                                type: Type.STRING,
                                description: "The Standard Algebraic Notation (SAN) move."
                            },
                            ...(fastMode ? {} : {
                                box: {
                                    type: Type.ARRAY,
                                    description: "Bounding box of the move on the image [ymin, xmin, ymax, xmax] scaled 0-1000.",
                                    items: { type: Type.INTEGER }
                                }
                            })
                        },
                        required: fastMode ? ["move"] : ["move", "box"]
                    }
                }
            },
            required: ["metadata", "moves"]
        };

        // The imageBase64 might come with a data URI prefix, we'll assume it's stripped by the frontend or 
        // we'll strip it here if present. Let's make sure it's clean base64.
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
                systemInstruction: systemInstruction,
                temperature: 0.1, // Low temperature for factual transcription
                responseMimeType: "application/json",
                responseSchema: responseSchema,
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
