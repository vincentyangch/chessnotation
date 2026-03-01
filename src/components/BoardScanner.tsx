"use client";

import { useState, useRef } from "react";
import { Chess, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Upload, Loader2, Camera, Trash2, Copy, ImageOff, Image as ImageIcon, BookOpen, Grid3x3, Bug } from "lucide-react";
import { useBoardResize } from "@/hooks/useBoardResize";
import { modifyFen } from "@/utils/fen";
import { compressImage } from "@/utils/imageCompress";
import { useDebugLog } from "@/hooks/useDebugLog";
import ImagePanel from "./shared/ImagePanel";
import MultiBoardImagePanel from "./shared/MultiBoardImagePanel";
import DebugConsole from "./analysis/DebugConsole";
import LichessExportModal from "./LichessExportModal";
import type { AppSettings, DetectedBoard } from "@/types";

type Tool = { color: 'w' | 'b', type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k' } | 'trash' | null;

export default function BoardScanner({ settings }: { settings: AppSettings }) {
    const [game, setGame] = useState(new Chess());
    const [currentPosition, setCurrentPosition] = useState(game.fen());
    const { debugLogs, showDebug, addLog, toggleDebug } = useDebugLog();

    const [isParsingImage, setIsParsingImage] = useState(false);
    const [isParsingMulti, setIsParsingMulti] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [showImagePanel, setShowImagePanel] = useState(true);

    // Multi-board state
    const [detectedBoards, setDetectedBoards] = useState<DetectedBoard[]>([]);
    const [selectedBoardIndex, setSelectedBoardIndex] = useState<number | null>(null);
    const [multiBoardImage, setMultiBoardImage] = useState<string | null>(null);

    const [activeTool, setActiveTool] = useState<Tool>(null);
    const [showLichessModal, setShowLichessModal] = useState(false);

    const { boardWrapperRef } = useBoardResize();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const multiFileInputRef = useRef<HTMLInputElement>(null);

    const clearMessages = () => {
        setErrorMsg("");
        setSuccessMsg("");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsingImage(true);
        clearMessages();
        // Clear multi-board state when doing single scan
        setDetectedBoards([]);
        setSelectedBoardIndex(null);
        setMultiBoardImage(null);

        try {
            // Compress image before sending (e.g., 8MB → 200KB)
            addLog("Compressing image...");
            const startCompress = Date.now();
            const { base64, mimeType } = await compressImage(file, 1024, 0.8);
            addLog(`Image compressed in ${Date.now() - startCompress}ms (${Math.round(base64.length / 1024)}KB)`);

            addLog(`Calling /api/parse-board (model: ${settings.geminiModel})...`);
            const startApi = Date.now();
            const res = await fetch('/api/parse-board', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: base64,
                    mimeType: mimeType,
                    apiKey: settings.geminiApiKey,
                    model: settings.geminiModel
                })
            });
            addLog(`API responded in ${Date.now() - startApi}ms (status: ${res.status})`);

            if (res.ok) {
                const data = await res.json();
                if (data.fen) {
                    addLog(`FEN: ${data.fen}`);
                    try {
                        const newGame = new Chess(data.fen);
                        setGame(newGame);
                        setCurrentPosition(newGame.fen());
                        setUploadedImage(base64);
                        setShowImagePanel(true);
                        setSuccessMsg("Board parsed successfully!");
                    } catch {
                        addLog(`Invalid FEN: ${data.fen}`, "error");
                        setErrorMsg("API returned an invalid FEN: " + data.fen);
                    }
                } else {
                    setErrorMsg("Failed to parse board from the image.");
                }
            } else {
                const errData = await res.json();
                setErrorMsg(errData.error || "Failed to parse image.");
            }
        } catch {
            setErrorMsg("Error uploading image.");
        } finally {
            setIsParsingImage(false);
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleMultiBoardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsingMulti(true);
        clearMessages();
        // Clear single board state
        setUploadedImage(null);
        setDetectedBoards([]);
        setSelectedBoardIndex(null);

        try {
            // Compress image before sending (higher res for multi-board to preserve detail)
            const { base64: base64data, mimeType: compressedMimeType } = await compressImage(file, 1536, 0.85);

            // ── Phase 1: Detect board locations (fast, no FEN) ──
            setSuccessMsg("Phase 1: Detecting board locations...");
            const detectRes = await fetch('/api/parse-boards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: base64data,
                    mimeType: compressedMimeType,
                    apiKey: settings.geminiApiKey,
                    model: settings.geminiModel
                })
            });

            if (!detectRes.ok) {
                const errData = await detectRes.json();
                setErrorMsg(errData.error || "Failed to detect boards.");
                setIsParsingMulti(false);
                return;
            }

            const detectData = await detectRes.json();
            if (!detectData.boards || !Array.isArray(detectData.boards) || detectData.boards.length === 0) {
                setErrorMsg("No chessboards found in the image.");
                setIsParsingMulti(false);
                return;
            }

            // Initialize boards with parsing state
            const initialBoards: DetectedBoard[] = detectData.boards.map((b: { box: [number, number, number, number]; label?: string }) => ({
                fen: "",
                box: b.box,
                label: b.label || "",
                parsing: true,
            }));

            setDetectedBoards(initialBoards);
            setMultiBoardImage(base64data);
            setShowImagePanel(true);
            setSuccessMsg(`Found ${initialBoards.length} board${initialBoards.length !== 1 ? 's' : ''}. Parsing positions...`);

            // ── Phase 2: Parse each board's FEN in parallel ──
            const promises = initialBoards.map(async (board, i) => {
                try {
                    const parseRes = await fetch('/api/parse-board', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            imageBase64: base64data,
                            mimeType: compressedMimeType,
                            apiKey: settings.geminiApiKey,
                            model: settings.geminiModel,
                            boardHint: board.box,
                        })
                    });

                    if (parseRes.ok) {
                        const parseData = await parseRes.json();
                        return { index: i, fen: parseData.fen || "", error: parseData.fen ? undefined : "No FEN returned" };
                    } else {
                        const errData = await parseRes.json();
                        return { index: i, fen: "", error: errData.error || "Parse failed" };
                    }
                } catch {
                    return { index: i, fen: "", error: "Network error" };
                }
            });

            // Update boards as each resolve comes in
            for (const promise of promises) {
                const result = await promise;
                setDetectedBoards(prev => prev.map((b, i) =>
                    i === result.index
                        ? { ...b, fen: result.fen, parsing: false, error: result.error }
                        : b
                ));
            }

            // Wait for all to complete
            await Promise.all(promises);
            setIsParsingMulti(false);

            const completedCount = initialBoards.length;
            setSuccessMsg(`All ${completedCount} board${completedCount !== 1 ? 's' : ''} parsed! Click one to load.`);
        } catch {
            setErrorMsg("Error uploading image.");
            setIsParsingMulti(false);
        }

        if (multiFileInputRef.current) multiFileInputRef.current.value = "";
    };

    function handleBoardSelect(index: number) {
        const board = detectedBoards[index];
        if (!board) return;

        try {
            const newGame = new Chess(board.fen);
            setGame(newGame);
            setCurrentPosition(newGame.fen());
            setSelectedBoardIndex(index);
            clearMessages();
            setSuccessMsg(`Loaded ${board.label || `Board ${index + 1}`}`);
        } catch {
            setErrorMsg(`Invalid FEN for ${board.label || `Board ${index + 1}`}: ${board.fen}`);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onPieceDrop(args: any) {
        const { sourceSquare, targetSquare, piece } = args;
        if (!targetSquare) return false;
        const pieceStr: string = typeof piece === 'string' ? piece : (piece?.pieceType ?? String(piece));
        setCurrentPosition((prevFen) => {
            const charToPlace = pieceStr[0] === 'w' ? pieceStr[1].toUpperCase() : pieceStr[1].toLowerCase();
            let nextFen = modifyFen(prevFen, sourceSquare, ' ');
            nextFen = modifyFen(nextFen, targetSquare, charToPlace);
            return nextFen;
        });
        return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onSquareClick(args: any) {
        const { square } = args as { square: Square };
        if (!activeTool) return;
        clearMessages();

        setCurrentPosition(prevFen => {
            if (activeTool === 'trash') {
                return modifyFen(prevFen, square, ' ');
            } else {
                const charToPlace = activeTool.color === 'w' ? activeTool.type.toUpperCase() : activeTool.type.toLowerCase();
                return modifyFen(prevFen, square, charToPlace);
            }
        });
    }

    function executeReset() {
        setCurrentPosition("8/8/8/8/8/8/8/8 w - - 0 1");
        setUploadedImage(null);
        setDetectedBoards([]);
        setSelectedBoardIndex(null);
        setMultiBoardImage(null);
        clearMessages();
    }

    function setStartingPosition() {
        const newGame = new Chess();
        setGame(newGame);
        setCurrentPosition(newGame.fen());
        clearMessages();
    }

    function copyFen() {
        navigator.clipboard.writeText(currentPosition).then(() => {
            setSuccessMsg("FEN copied to clipboard");
        }).catch(() => {
            setErrorMsg("Failed to copy FEN");
        });
    }

    const renderPieceBtn = (color: 'w' | 'b', type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k', icon: string) => {
        const isActive = activeTool !== 'trash' && activeTool?.color === color && activeTool?.type === type;
        return (
            <button
                onClick={() => setActiveTool({ color, type })}
                className={`w-10 h-10 flex items-center justify-center text-3xl rounded-md transition hover:bg-slate-700 ${isActive ? 'bg-indigo-600/50 border-2 border-indigo-400' : 'bg-slate-800 border border-slate-700'}`}
            >
                <span className={color === 'w' ? 'text-white' : 'text-slate-900 drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]'}>
                    {icon}
                </span>
            </button>
        );
    };

    const hasMultiBoard = detectedBoards.length > 0 && multiBoardImage;
    const hasSingleImage = uploadedImage && !hasMultiBoard;
    const showRightPanel = (hasSingleImage && showImagePanel) || hasMultiBoard;

    return (
        <div className={`grid grid-cols-1 ${showRightPanel ? 'xl:grid-cols-4 lg:grid-cols-3' : 'lg:grid-cols-3'} gap-6 items-start transition-all duration-300`}>
            <div className={`${showRightPanel ? 'xl:col-span-2 lg:col-span-1' : 'lg:col-span-2'} flex flex-col items-center w-full relative space-y-4`}>

                {/* Toolbox */}
                <div className="flex flex-col gap-2 bg-slate-800 p-4 rounded-xl border border-slate-700 w-full max-w-2xl shadow-lg">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Pieces & Tools</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={setStartingPosition}
                                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded transition"
                            >
                                Start Position
                            </button>
                            <button
                                onClick={executeReset}
                                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded transition"
                            >
                                Clear Board
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {renderPieceBtn('w', 'k', '♔')}
                        {renderPieceBtn('w', 'q', '♕')}
                        {renderPieceBtn('w', 'r', '♖')}
                        {renderPieceBtn('w', 'b', '♗')}
                        {renderPieceBtn('w', 'n', '♘')}
                        {renderPieceBtn('w', 'p', '♙')}
                        <div className="w-4" />
                        {renderPieceBtn('b', 'k', '♚')}
                        {renderPieceBtn('b', 'q', '♛')}
                        {renderPieceBtn('b', 'r', '♜')}
                        {renderPieceBtn('b', 'b', '♝')}
                        {renderPieceBtn('b', 'n', '♞')}
                        {renderPieceBtn('b', 'p', '♟')}
                        <div className="w-4" />
                        <button
                            onClick={() => setActiveTool(activeTool === 'trash' ? null : 'trash')}
                            className={`w-10 h-10 flex items-center justify-center rounded-md transition hover:bg-slate-700 ${activeTool === 'trash' ? 'bg-red-600/50 border-2 border-red-400 text-white' : 'bg-slate-800 border border-slate-700 text-red-400'}`}
                            title="Delete Piece"
                        >
                            <Trash2 size={20} />
                        </button>
                        <button
                            onClick={() => setActiveTool(null)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition hover:bg-slate-700 ${activeTool === null ? 'bg-slate-600 text-white shadow-inner' : 'bg-slate-800 border border-slate-700 text-slate-400'}`}
                        >
                            Move Only
                        </button>
                    </div>
                    {activeTool && (
                        <div className="text-xs text-center text-amber-400/80 mt-2 font-medium">
                            Click on squares to place/remove. Disable tool to use normal drag & drop.
                        </div>
                    )}
                </div>

                <div className="flex gap-4 w-full max-w-2xl px-2">
                    <div
                        ref={boardWrapperRef}
                        className="flex-grow aspect-square shadow-2xl rounded-sm overflow-hidden border-4 border-slate-700 bg-slate-800"
                    >
                        <Chessboard
                            options={{
                                id: "ScannerBoard",
                                position: currentPosition,
                                onPieceDrop: onPieceDrop,
                                onSquareClick: activeTool ? onSquareClick : undefined,
                                darkSquareStyle: { backgroundColor: "#475569" },
                                lightSquareStyle: { backgroundColor: "#cbd5e1" },
                                animationDurationInMs: 200
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            } as any}
                        />
                    </div>
                </div>
            </div>

            {/* Control Panel */}
            <div className="flex flex-col bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl sticky top-8">
                <div className="p-4 bg-slate-900 border-b border-slate-700">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Camera className="text-indigo-400" /> Image Scanner
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Upload an image of a chessboard to extract its position.</p>
                </div>

                <div className="flex flex-col gap-3 p-4 border-b border-slate-700">
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <input
                        type="file"
                        accept="image/*"
                        ref={multiFileInputRef}
                        onChange={handleMultiBoardUpload}
                        className="hidden"
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isParsingImage || isParsingMulti}
                        className="flex justify-center items-center gap-2 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition font-medium shadow-md w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isParsingImage ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        {isParsingImage ? "Scanning..." : "Scan Single Board"}
                    </button>

                    <button
                        onClick={() => multiFileInputRef.current?.click()}
                        disabled={isParsingImage || isParsingMulti}
                        className="flex justify-center items-center gap-2 py-3 bg-violet-600/90 text-white rounded-md hover:bg-violet-500 transition font-medium shadow-md w-full disabled:opacity-50 disabled:cursor-not-allowed border border-violet-500/30"
                    >
                        {isParsingMulti ? <Loader2 size={18} className="animate-spin" /> : <Grid3x3 size={18} />}
                        {isParsingMulti ? "Detecting boards..." : "Scan Multiple Boards"}
                    </button>

                    {(uploadedImage || multiBoardImage) && (
                        <button
                            onClick={() => setShowImagePanel(!showImagePanel)}
                            className="flex justify-center flex-1 items-center gap-2 py-2 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600 transition text-sm font-medium w-full"
                        >
                            {showImagePanel ? <ImageOff size={16} /> : <ImageIcon size={16} />}
                            {showImagePanel ? "Hide Image" : "Show Image"}
                        </button>
                    )}

                    <button
                        onClick={toggleDebug}
                        className="flex justify-center items-center gap-2 py-2 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600 transition text-sm font-medium w-full"
                        title="Toggle Debug Console"
                    >
                        <Bug size={16} className={showDebug ? "text-emerald-400" : "text-slate-400"} />
                        {showDebug ? "Hide Debug" : "Show Debug"}
                    </button>

                    {(errorMsg || successMsg) && (
                        <div className={`p-3 rounded text-sm ${errorMsg ? 'bg-red-900/40 border border-red-500/50 text-red-400' : 'bg-emerald-900/40 border border-emerald-500/50 text-emerald-400'}`}>
                            {errorMsg || successMsg}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-900 flex flex-col gap-3">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Export Position</h3>

                    <div className="bg-slate-800 p-2 rounded border border-slate-700 overflow-x-auto">
                        <code className="text-xs text-slate-300 font-mono whitespace-nowrap">{currentPosition}</code>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={copyFen}
                            className="flex-1 flex justify-center items-center gap-2 py-2 bg-slate-700 text-slate-200 rounded hover:bg-slate-600 transition text-sm font-medium"
                        >
                            <Copy size={16} /> Copy FEN
                        </button>
                        <button
                            onClick={() => setShowLichessModal(true)}
                            className="flex-1 flex justify-center items-center gap-2 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition text-sm font-medium shadow-md shadow-blue-900/50"
                        >
                            <BookOpen size={16} /> Export to Study
                        </button>
                    </div>
                </div>

                {/* Debug Console */}
                {showDebug && (
                    <div className="border-t border-slate-700">
                        <DebugConsole debugLogs={debugLogs} />
                    </div>
                )}
            </div>

            {/* Lichess Export Modal */}
            {showLichessModal && (
                <LichessExportModal
                    settings={settings}
                    pgn={(() => {
                        const tempGame = new Chess(currentPosition);
                        if (game.history().length > 0) {
                            tempGame.loadPgn(game.pgn());
                        }
                        tempGame.header("setUp", "1", "FEN", currentPosition);
                        return tempGame.pgn() || `[FEN "${currentPosition}"]\n[SetUp "1"]\n\n*`;
                    })()}
                    onClose={() => setShowLichessModal(false)}
                    defaultChapterName={
                        selectedBoardIndex !== null && detectedBoards[selectedBoardIndex]?.label
                            ? detectedBoards[selectedBoardIndex].label!
                            : "Scanned Position"
                    }
                />
            )}

            {/* Multi-board image panel */}
            {hasMultiBoard && showImagePanel && (
                <MultiBoardImagePanel
                    image={multiBoardImage!}
                    boards={detectedBoards}
                    selectedIndex={selectedBoardIndex}
                    onBoardSelect={handleBoardSelect}
                />
            )}

            {/* Single image panel */}
            {hasSingleImage && showImagePanel && (
                <ImagePanel
                    image={uploadedImage!}
                    title="Original Image"
                />
            )}
        </div>
    );
}
