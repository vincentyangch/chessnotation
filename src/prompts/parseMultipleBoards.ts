import { Type, Schema } from '@google/genai';

export const detectBoardsPrompt = `You are an expert chess arbiter and computer vision system.
Your task is to LOCATE all chessboards visible in an image (could be a book page, a magazine, a screenshot, etc.). You do NOT need to parse the positions — only find the board locations.

Rules:
1. Find EVERY chessboard or chess diagram in the image. There may be 1 to 12 boards.
2. For each board, provide a bounding box [ymin, xmin, ymax, xmax] where each value is scaled proportionally to the image dimensions (0-1000). The bounding box should tightly enclose the chessboard squares only (exclude labels/captions).
3. If there is a label, caption, or diagram number near the board (e.g., "Diagram 1", "Position A", "5"), include it as the label. Also check for "White to play" or "Black to play" indicators.
4. Order the boards from top-left to bottom-right (reading order).

Return ONLY a valid JSON object matching the requested schema.`;

export const detectBoardsSchema: Schema = {
    type: Type.OBJECT,
    description: "All chessboard locations detected in the image.",
    properties: {
        boards: {
            type: Type.ARRAY,
            description: "List of detected chessboard locations.",
            items: {
                type: Type.OBJECT,
                properties: {
                    box: {
                        type: Type.ARRAY,
                        description: "Bounding box of the chessboard [ymin, xmin, ymax, xmax] scaled 0-1000 proportional to image dimensions.",
                        items: { type: Type.INTEGER }
                    },
                    label: {
                        type: Type.STRING,
                        description: "Label or caption found near this board (e.g., 'Diagram 5', '5 - Black to play'). Empty string if none found."
                    }
                },
                required: ["box", "label"]
            }
        }
    },
    required: ["boards"]
};
