import { Type, Schema } from '@google/genai';

export function getParseImagePrompt(fastMode: boolean): string {
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

    return baseInstructions + (fastMode ? fastInstructions : boxInstructions);
}

export function getParseImageSchema(fastMode: boolean): Schema {
    return {
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
}
