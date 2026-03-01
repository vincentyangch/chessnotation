// Centralized type definitions for the Chess Notation app

export type AppSettings = {
    geminiApiKey: string;
    geminiModel: string;
    fastMode: boolean;
    stockfishDepth: number;
    stockfishEnabled: boolean;
    lichessToken: string;
};

export const defaultSettings: AppSettings = {
    geminiApiKey: "",
    geminiModel: "gemini-3-flash-preview",
    fastMode: false,
    stockfishDepth: 10,
    stockfishEnabled: true,
    lichessToken: ""
};

export type AnalysisResult = {
    bestMove: string;
    evaluation: {
        cp: number;
        mate: number | null;
        comment: string;
        fen: string;
    };
};

export type ParsedMove = {
    move: string;
    box: [number, number, number, number]; // [ymin, xmin, ymax, xmax] scaled 0-1000
};

export interface GameMetadata {
    event?: string;
    date?: string;
    round?: string;
    white?: string;
    black?: string;
}

export type DebugLogEntry = {
    time: string;
    message: string;
    type: 'info' | 'error';
};

export interface LichessAccount {
    id: string;
    username: string;
}

export interface LichessStudy {
    id: string;
    name: string;
    updatedAt?: number;
}

export interface DetectedBoard {
    fen: string;
    box: [number, number, number, number]; // [ymin, xmin, ymax, xmax] scaled 0-1000
    label?: string; // e.g., "Board 1", "Diagram 3a"
    parsing?: boolean; // true while FEN is being parsed in Phase 2
    error?: string; // error message if FEN parsing failed
}
