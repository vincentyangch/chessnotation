import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export const runtime = 'nodejs'; // Use nodejs for larger payloads if needed, or edge
export const maxDuration = 60; // Allow more time for Gemini to process the image

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY environment variable is missing." }, { status: 500 });
        }

        const body = await req.json();
        const { imageBase64, mimeType = "image/jpeg", fastMode = false } = body;

        if (!imageBase64) {
            return NextResponse.json({ error: "No imageBase64 provided." }, { status: 400 });
        }

        const ai = new GoogleGenAI({ apiKey });

        const baseInstructions = `You are an expert chess arbiter and game transcriber with spatial reasoning capabilities. 
Your task is to transcribe a handwritten or printed chess notation sheet into a JSON array of objects.
Follow these exact rules:
1. Examine the image carefully. It may have two columns (White and Black) or be numbered by moves.
2. Read the moves sequentially from move 1 to the end.
3. Fix obvious OCR/handwriting errors (e.g., '0-0' vs 'O-O', recognizing pieces if context demands it).`;

        const boxInstructions = `
4. Return ONLY a valid JSON array of objects in order. Each object must have a "move" string and a "box" array of exactly 4 numeric values [ymin, xmin, ymax, xmax].
   - ymin, xmin, ymax, xmax must be mapped between 0 and 1000 representing the bounding box coordinates proportional to the image dimensions.
   Example: [{"move": "e4", "box": [120, 150, 150, 250]}, {"move": "e5", "box": [120, 350, 150, 450]}]`;

        const fastInstructions = `
4. Return ONLY a valid JSON array of objects in order. Each object must have a "move" string.`;

        const systemInstruction = baseInstructions + (fastMode ? fastInstructions : boxInstructions);

        // Define the schema based on whether fastMode is enabled
        const responseSchema: Schema = {
            type: Type.ARRAY,
            description: "List of chess moves extracted from the image.",
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
                            items: {
                                type: Type.INTEGER
                            }
                        }
                    })
                },
                required: fastMode ? ["move"] : ["move", "box"]
            }
        };

        // The imageBase64 might come with a data URI prefix, we'll assume it's stripped by the frontend or 
        // we'll strip it here if present. Let's make sure it's clean base64.
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
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

        const responseText = response.text || "[]";

        try {
            const parsedMoves = JSON.parse(responseText);
            if (!Array.isArray(parsedMoves)) {
                throw new Error("Response is not an array");
            }
            return NextResponse.json({ moves: parsedMoves });
        } catch (jsonError) {
            console.error("Failed to parse Gemini response as JSON:", responseText);
            return NextResponse.json({ error: "Failed to parse moves from the image. Gemini did not return valid JSON.", rawText: responseText }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Parse Image Error:", error);
        return NextResponse.json({ error: "Internal server error parsing image.", details: error.message }, { status: 500 });
    }
}
