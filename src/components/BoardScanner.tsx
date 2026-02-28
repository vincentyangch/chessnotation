"use client";

import { useState, useRef, useEffect } from "react";
import { Chess, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Upload, Loader2, Camera, Trash2, Copy, ExternalLink, Image as ImageIcon, ImageOff } from "lucide-react";

export default function BoardScanner() {
    const [game, setGame] = useState(new Chess());
    const [currentPosition, setCurrentPosition] = useState(game.fen());

    const [isParsingImage, setIsParsingImage] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [showImagePanel, setShowImagePanel] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const boardWrapperRef = useRef<HTMLDivElement>(null);
    const [boardWidth, setBoardWidth] = useState(400);

    type Tool = { color: 'w' | 'b', type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k' } | 'trash' | null;
    const [activeTool, setActiveTool] = useState<Tool>(null);

    useEffect(() => {
        const handleResize = () => {
            if (boardWrapperRef.current) {
                setBoardWidth(boardWrapperRef.current.offsetWidth);
            }
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const clearMessages = () => {
        setErrorMsg("");
        setSuccessMsg("");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsingImage(true);
        clearMessages();

        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result as string;

                const res = await fetch('/api/parse-board', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64data, mimeType: file.type })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.fen) {
                        try {
                            const newGame = new Chess(data.fen);
                            setGame(newGame);
                            setCurrentPosition(newGame.fen());
                            setUploadedImage(base64data);
                            setShowImagePanel(true);
                            setSuccessMsg("Board parsed successfully!");
                        } catch (_) {
                            setErrorMsg("API returned an invalid FEN: " + data.fen);
                        }
                    } else {
                        setErrorMsg("Failed to parse board from the image.");
                    }
                } else {
                    const errData = await res.json();
                    setErrorMsg(errData.error || "Failed to parse image.");
                }
                setIsParsingImage(false);
            };
            reader.readAsDataURL(file);
        } catch (e: unknown) {
            setErrorMsg("Error uploading image.");
            setIsParsingImage(false);
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // FEN mutation helper bypasses chess.js completely
    function modifyFen(fen: string, square: string, charToPlace: ' ' | string): string {
        try {
            const parts = fen.split(' ');
            const board = parts[0].split('/');

            const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
            const rank = 8 - parseInt(square[1], 10);

            const rankStr = board[rank];
            let expanded = '';
            for (let i = 0; i < rankStr.length; i++) {
                if (/[1-8]/.test(rankStr[i])) {
                    expanded += ' '.repeat(parseInt(rankStr[i]));
                } else {
                    expanded += rankStr[i];
                }
            }

            const newExpanded = expanded.substring(0, file) + charToPlace + expanded.substring(file + 1);

            let newRankStr = '';
            let emptyCount = 0;
            for (let i = 0; i < newExpanded.length; i++) {
                if (newExpanded[i] === ' ') {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        newRankStr += emptyCount;
                        emptyCount = 0;
                    }
                    newRankStr += newExpanded[i];
                }
            }
            if (emptyCount > 0) {
                newRankStr += emptyCount;
            }

            board[rank] = newRankStr;
            parts[0] = board.join('/');
            return parts.join(' ');
        } catch (e) {
            return fen;
        }
    }



    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onPieceDrop(args: any) {
        const { sourceSquare, targetSquare, piece } = args as { sourceSquare: Square, targetSquare: Square, piece: string };

        setCurrentPosition((prevFen) => {
            const charToPlace = piece[0] === 'w' ? piece[1].toUpperCase() : piece[1].toLowerCase();
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
        setCurrentPosition("8/8/8/8/8/8/8/8 w - - 0 1"); // empty board
        setUploadedImage(null);
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

    function exportToLichess() {
        const formattedFen = currentPosition.replace(/ /g, '_');
        const url = `https://lichess.org/editor/${formattedFen}?color=white`;
        window.open(url, "_blank");
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

    return (
        <div className={`grid grid-cols-1 ${uploadedImage && showImagePanel ? 'xl:grid-cols-4 lg:grid-cols-3' : 'lg:grid-cols-3'} gap-6 items-start transition-all duration-300`}>
            <div className={`${uploadedImage && showImagePanel ? 'xl:col-span-2 lg:col-span-1' : 'lg:col-span-2'} flex flex-col items-center w-full relative space-y-4`}>

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

                <div className="flex flex-col gap-4 p-4 border-b border-slate-700">
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isParsingImage}
                        className="flex justify-center items-center gap-2 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition font-medium shadow-md w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isParsingImage ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        {isParsingImage ? "Parsing..." : "Upload Board Image"}
                    </button>

                    {uploadedImage && (
                        <button
                            onClick={() => setShowImagePanel(!showImagePanel)}
                            className="flex justify-center flex-1 items-center gap-2 py-2 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600 transition text-sm font-medium w-full"
                        >
                            {showImagePanel ? <ImageOff size={16} /> : <ImageIcon size={16} />}
                            {showImagePanel ? "Hide Original Image" : "Show Original Image"}
                        </button>
                    )}

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
                            onClick={exportToLichess}
                            className="flex-1 flex justify-center items-center gap-2 py-2 bg-slate-700 text-slate-200 rounded hover:bg-slate-600 transition text-sm font-medium"
                        >
                            <ExternalLink size={16} /> Lichess Editor
                        </button>
                    </div>
                </div>
            </div>

            {/* Image Display Panel */}
            {uploadedImage && showImagePanel && (
                <div className="flex flex-col bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl sticky top-8 xl:col-span-1 lg:col-span-1 h-[max(600px,calc(100vh-8rem))]">
                    <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-200">Original Image</h3>
                    </div>
                    <div className="flex-1 relative overflow-auto p-4 flex items-start justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={uploadedImage}
                            alt="Board Image"
                            className="max-w-full h-auto rounded-md object-contain border border-slate-600 shadow-inner"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
