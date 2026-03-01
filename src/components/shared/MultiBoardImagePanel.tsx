import React, { useState } from "react";
import { Grid3x3, MousePointerClick, Loader2, AlertTriangle } from "lucide-react";
import type { DetectedBoard } from "@/types";

// Color palette for board highlights
const BOARD_COLORS = [
    { border: "rgba(99, 102, 241, 0.8)", bg: "rgba(99, 102, 241, 0.15)", label: "bg-indigo-500" },
    { border: "rgba(236, 72, 153, 0.8)", bg: "rgba(236, 72, 153, 0.15)", label: "bg-pink-500" },
    { border: "rgba(34, 197, 94, 0.8)", bg: "rgba(34, 197, 94, 0.15)", label: "bg-emerald-500" },
    { border: "rgba(245, 158, 11, 0.8)", bg: "rgba(245, 158, 11, 0.15)", label: "bg-amber-500" },
    { border: "rgba(6, 182, 212, 0.8)", bg: "rgba(6, 182, 212, 0.15)", label: "bg-cyan-500" },
    { border: "rgba(168, 85, 247, 0.8)", bg: "rgba(168, 85, 247, 0.15)", label: "bg-purple-500" },
    { border: "rgba(239, 68, 68, 0.8)", bg: "rgba(239, 68, 68, 0.15)", label: "bg-red-500" },
    { border: "rgba(20, 184, 166, 0.8)", bg: "rgba(20, 184, 166, 0.15)", label: "bg-teal-500" },
    { border: "rgba(251, 146, 60, 0.8)", bg: "rgba(251, 146, 60, 0.15)", label: "bg-orange-500" },
    { border: "rgba(59, 130, 246, 0.8)", bg: "rgba(59, 130, 246, 0.15)", label: "bg-blue-500" },
    { border: "rgba(244, 63, 94, 0.8)", bg: "rgba(244, 63, 94, 0.15)", label: "bg-rose-500" },
    { border: "rgba(132, 204, 22, 0.8)", bg: "rgba(132, 204, 22, 0.15)", label: "bg-lime-500" },
];

interface MultiBoardImagePanelProps {
    image: string;
    boards: DetectedBoard[];
    selectedIndex: number | null;
    onBoardSelect: (index: number) => void;
}

export default function MultiBoardImagePanel({
    image,
    boards,
    selectedIndex,
    onBoardSelect,
}: MultiBoardImagePanelProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const parsedCount = boards.filter(b => !b.parsing).length;
    const allParsed = parsedCount === boards.length;

    return (
        <div className="flex flex-col bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl sticky top-8 xl:col-span-1 lg:col-span-1">
            {/* Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                    <Grid3x3 size={18} className="text-indigo-400" />
                    Detected Boards
                </h3>
                <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded font-medium">
                    {allParsed
                        ? `${boards.length} board${boards.length !== 1 ? 's' : ''} ready`
                        : `${parsedCount}/${boards.length} parsed`
                    }
                </span>
            </div>

            {/* Progress bar during parsing */}
            {!allParsed && (
                <div className="h-1 bg-slate-700">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                        style={{ width: `${(parsedCount / boards.length) * 100}%` }}
                    />
                </div>
            )}

            {/* Image with overlays */}
            <div className="relative overflow-auto p-4 flex items-start justify-center">
                <div className="relative inline-block max-w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={image}
                        alt="Multi-board scan"
                        className="max-w-full h-auto rounded-md object-contain border border-slate-600"
                    />

                    {/* Bounding box overlays */}
                    {boards.map((board, i) => {
                        const [ymin, xmin, ymax, xmax] = board.box;
                        const color = BOARD_COLORS[i % BOARD_COLORS.length];
                        const isSelected = selectedIndex === i;
                        const isHovered = hoveredIndex === i;
                        const isParsing = board.parsing;
                        const hasError = !!board.error;
                        const isReady = !isParsing && !hasError && board.fen;

                        const padding = 0.5;
                        const top = Math.max(0, (ymin / 1000) * 100 - padding);
                        const left = Math.max(0, (xmin / 1000) * 100 - padding);
                        const height = Math.min(100 - top, ((ymax - ymin) / 1000) * 100 + padding * 2);
                        const width = Math.min(100 - left, ((xmax - xmin) / 1000) * 100 + padding * 2);

                        return (
                            <button
                                key={i}
                                onClick={() => isReady && onBoardSelect(i)}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                className={`absolute transition-all duration-200 group ${isReady ? 'cursor-pointer' : isParsing ? 'cursor-wait' : 'cursor-not-allowed'}`}
                                style={{
                                    top: `${top}%`,
                                    left: `${left}%`,
                                    height: `${height}%`,
                                    width: `${width}%`,
                                    border: `3px solid ${hasError ? 'rgba(239, 68, 68, 0.8)' : isParsing ? 'rgba(148, 163, 184, 0.5)' : color.border}`,
                                    backgroundColor: isSelected
                                        ? color.bg
                                        : isHovered && isReady
                                            ? color.bg
                                            : isParsing
                                                ? 'rgba(148, 163, 184, 0.05)'
                                                : 'transparent',
                                    borderRadius: '4px',
                                    borderStyle: isParsing ? 'dashed' : 'solid',
                                    boxShadow: isSelected
                                        ? `0 0 20px ${color.border}, inset 0 0 20px ${color.bg}`
                                        : isHovered && isReady
                                            ? `0 0 12px ${color.border}`
                                            : 'none',
                                    zIndex: isSelected ? 20 : isHovered ? 15 : 10,
                                }}
                                title={isParsing ? 'Parsing...' : hasError ? board.error : `Click to load ${board.label || `Board ${i + 1}`}`}
                                disabled={!isReady}
                            >
                                {/* Label badge */}
                                <span
                                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-lg transition-all duration-200 ${hasError ? 'bg-red-500' : isParsing ? 'bg-slate-500' : color.label
                                        } ${isSelected ? 'scale-110' : ''}`}
                                >
                                    {isParsing && <Loader2 size={10} className="inline animate-spin mr-1" />}
                                    {hasError && <AlertTriangle size={10} className="inline mr-1" />}
                                    {board.label || `Board ${i + 1}`}
                                    {isSelected && ' ✓'}
                                </span>

                                {/* Click indicator on hover */}
                                {isHovered && isReady && !isSelected && (
                                    <span className="absolute inset-0 flex items-center justify-center">
                                        <span className="bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-sm">
                                            <MousePointerClick size={14} /> Click to load
                                        </span>
                                    </span>
                                )}

                                {/* Parsing spinner overlay */}
                                {isParsing && (
                                    <span className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 size={24} className="animate-spin text-slate-400" />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Board list */}
            <div className="p-3 bg-slate-900 border-t border-slate-700 max-h-48 overflow-y-auto">
                <div className="grid gap-1.5">
                    {boards.map((board, i) => {
                        const color = BOARD_COLORS[i % BOARD_COLORS.length];
                        const isSelected = selectedIndex === i;
                        const isParsing = board.parsing;
                        const hasError = !!board.error;
                        const isReady = !isParsing && !hasError && board.fen;

                        return (
                            <button
                                key={i}
                                onClick={() => isReady && onBoardSelect(i)}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                disabled={!isReady}
                                className={`flex items-center gap-3 p-2.5 rounded-lg text-left transition-all duration-150 group ${isSelected
                                        ? 'bg-indigo-600/20 border border-indigo-500/40'
                                        : isReady
                                            ? 'hover:bg-slate-800 border border-transparent'
                                            : 'border border-transparent opacity-70'
                                    }`}
                            >
                                <span
                                    className={`w-3 h-3 rounded-full flex-shrink-0 ${hasError ? 'bg-red-500' : isParsing ? 'bg-slate-500 animate-pulse' : color.label
                                        } ${isSelected ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-slate-900' : ''}`}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-slate-300'
                                        }`}>
                                        {board.label || `Board ${i + 1}`}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                                        {isParsing
                                            ? 'Parsing position...'
                                            : hasError
                                                ? board.error
                                                : board.fen.split(' ')[0]
                                        }
                                    </div>
                                </div>
                                {isParsing && (
                                    <Loader2 size={14} className="animate-spin text-slate-400 flex-shrink-0" />
                                )}
                                {hasError && (
                                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                                )}
                                {isSelected && (
                                    <span className="text-xs text-indigo-400 font-semibold flex-shrink-0">
                                        Active
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
