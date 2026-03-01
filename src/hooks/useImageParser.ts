import { useState, useRef, useCallback } from "react";
import type { ParsedMove, GameMetadata, AppSettings } from "@/types";

interface UseImageParserOptions {
    settings: AppSettings;
    onMoveParsed?: (moves: ParsedMove[], metadata: GameMetadata | null) => void;
    addLog?: (message: string, type?: 'info' | 'error') => void;
}

export function useImageParser({ settings, onMoveParsed, addLog }: UseImageParserOptions) {
    const [parsedMoves, setParsedMoves] = useState<ParsedMove[]>([]);
    const [currentParsedIndex, setCurrentParsedIndex] = useState(0);
    const [isParsingImage, setIsParsingImage] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [showImagePanel, setShowImagePanel] = useState(true);
    const [parseError, setParseError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsingImage(true);
        setParseError("");

        try {
            addLog?.(`Reading file: ${file.name} (${file.size} bytes)`);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result as string;

                addLog?.(`Sending image to Gemini parsing API...`);
                const res = await fetch('/api/parse-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageBase64: base64data,
                        mimeType: file.type,
                        fastMode: settings.fastMode,
                        apiKey: settings.geminiApiKey,
                        model: settings.geminiModel
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.moves && Array.isArray(data.moves)) {
                        addLog?.(`Successfully parsed ${data.moves.length} moves.`);
                        setParsedMoves(data.moves);
                        setCurrentParsedIndex(0);
                        setUploadedImage(base64data);
                        setShowImagePanel(true);

                        const metadata = data.metadata || null;
                        if (metadata) {
                            addLog?.(`Found game metadata: ${JSON.stringify(metadata)}`, "info");
                        }
                        onMoveParsed?.(data.moves, metadata);

                        if (data.moves.length === 0) {
                            setParseError("No moves found in the image.");
                            addLog?.("Gemini returned successfully but found 0 moves.", 'info');
                        }
                    } else {
                        setParseError("Failed to parse moves from the image.");
                        addLog?.(`Incorrect JSON payload structure returned from API.`, 'error');
                    }
                } else {
                    const errData = await res.json();
                    setParseError(errData.error || "Failed to parse image.");
                    addLog?.(`API error during parse: ${errData.error || res.statusText}`, 'error');
                }
                setIsParsingImage(false);
            };
            reader.readAsDataURL(file);
        } catch (e: unknown) {
            setParseError("Error uploading image.");
            const msg = e instanceof Error ? e.message : String(e);
            addLog?.(`File upload/parse exception: ${msg}`, 'error');
            setIsParsingImage(false);
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [settings, addLog, onMoveParsed]);

    const acceptParsedMove = useCallback(() => {
        if (currentParsedIndex < parsedMoves.length) {
            setCurrentParsedIndex(prev => prev + 1);
            return parsedMoves[currentParsedIndex];
        }
        return null;
    }, [currentParsedIndex, parsedMoves]);

    const skipParsedMove = useCallback(() => {
        if (currentParsedIndex < parsedMoves.length) {
            setCurrentParsedIndex(prev => prev + 1);
        }
    }, [currentParsedIndex, parsedMoves.length]);

    const revertParsedMove = useCallback(() => {
        if (currentParsedIndex > 0) {
            setCurrentParsedIndex(prev => prev - 1);
        }
    }, [currentParsedIndex]);

    const cancelParsedReview = useCallback(() => {
        setParsedMoves([]);
        setCurrentParsedIndex(0);
        setUploadedImage(null);
    }, []);

    const resetParser = useCallback(() => {
        setParsedMoves([]);
        setCurrentParsedIndex(0);
        setUploadedImage(null);
        setParseError("");
    }, []);

    const triggerFileInput = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Compute bounding box style for the current parsed move
    let activeBoxStyle: React.CSSProperties = {};
    if (uploadedImage && showImagePanel && parsedMoves.length > 0 && currentParsedIndex < parsedMoves.length) {
        const box = parsedMoves[currentParsedIndex].box;
        if (box && box.length === 4) {
            const [ymin, xmin, ymax, xmax] = box;
            const paddingY = 1.0;
            const paddingX = 2.0;
            const top = Math.max(0, (ymin / 1000) * 100 - paddingY);
            const left = Math.max(0, (xmin / 1000) * 100 - paddingX);
            const height = ((ymax - ymin) / 1000) * 100 + (paddingY * 2);
            const width = ((xmax - xmin) / 1000) * 100 + (paddingX * 2);
            activeBoxStyle = {
                top: `${top}%`,
                left: `${left}%`,
                height: `${height}%`,
                width: `${width}%`,
            };
        }
    }

    return {
        parsedMoves,
        currentParsedIndex,
        isParsingImage,
        uploadedImage,
        showImagePanel,
        setShowImagePanel,
        parseError,
        setParseError,
        fileInputRef,
        handleFileUpload,
        acceptParsedMove,
        skipParsedMove,
        revertParsedMove,
        cancelParsedReview,
        resetParser,
        triggerFileInput,
        activeBoxStyle,
    };
}
