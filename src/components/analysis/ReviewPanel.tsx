import { SquareTerminal, Undo2, Check, SkipForward, X } from "lucide-react";
import type { ParsedMove } from "@/types";

interface ReviewPanelProps {
    parsedMoves: ParsedMove[];
    currentParsedIndex: number;
    onAccept: () => void;
    onSkip: () => void;
    onRevert: () => void;
    onCancel: () => void;
}

export default function ReviewPanel({
    parsedMoves,
    currentParsedIndex,
    onAccept,
    onSkip,
    onRevert,
    onCancel,
}: ReviewPanelProps) {
    if (parsedMoves.length === 0 || currentParsedIndex >= parsedMoves.length) {
        return null;
    }

    return (
        <div className="p-4 bg-amber-900/20 border-b border-amber-500/20">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-amber-500 font-semibold tracking-wide text-sm uppercase">
                    <SquareTerminal size={16} />
                    <span>Review Notation</span>
                </div>
                <button onClick={onCancel} className="text-slate-500 hover:text-slate-300">
                    <X size={16} />
                </button>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-slate-800 rounded-lg border border-amber-500/30">
                <div className="text-sm text-slate-400 mb-1">
                    Move {Math.floor(currentParsedIndex / 2) + 1}
                    {currentParsedIndex % 2 === 0 ? " (White)" : " (Black)"}
                </div>
                <div className="text-2xl font-bold text-white mb-4">
                    {parsedMoves[currentParsedIndex]?.move}
                </div>
                <div className="flex gap-2 w-full">
                    <button
                        onClick={onRevert}
                        disabled={currentParsedIndex === 0}
                        className="flex-1 flex justify-center items-center gap-2 py-2 bg-slate-700 text-slate-200 rounded hover:bg-slate-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Undo2 size={18} /> Prev
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-[2] flex justify-center items-center gap-2 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500 transition font-medium"
                    >
                        <Check size={18} /> Accept
                    </button>
                    <button
                        onClick={onSkip}
                        className="flex-1 flex justify-center items-center gap-2 py-2 bg-slate-700 text-slate-200 rounded hover:bg-slate-600 transition font-medium"
                    >
                        <SkipForward size={18} /> Skip
                    </button>
                </div>
                <div className="text-xs text-slate-500 mt-3 text-center">
                    Or make the correct move manually on the board.
                </div>
            </div>
        </div>
    );
}
