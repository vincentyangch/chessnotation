import { Move } from "chess.js";
import { Play } from "lucide-react";

interface MoveHistoryProps {
    history: Move[];
}

export default function MoveHistory({ history }: MoveHistoryProps) {
    if (history.length === 0) {
        return (
            <div className="flex-1 p-4 overflow-y-auto min-h-[300px] max-h-[400px]">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Move History</h3>
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 mt-12">
                    <Play size={24} className="opacity-50" />
                    <p className="text-sm">Make a move to start</p>
                </div>
            </div>
        );
    }

    // Group moves into pairs (white, black)
    const movePairs = history.reduce<Move[][]>((result, move, index) => {
        if (index % 2 === 0) {
            result.push([move]);
        } else {
            result[result.length - 1].push(move);
        }
        return result;
    }, []);

    return (
        <div className="flex-1 p-4 overflow-y-auto min-h-[300px] max-h-[400px]">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Move History</h3>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-sm leading-relaxed">
                {movePairs.map((pair, i) => (
                    <div key={i} className="contents">
                        <div className="text-slate-500 text-right select-none w-8">{(i + 1)}.</div>
                        <div className="flex gap-4">
                            <span className="w-16 text-slate-200">{pair[0].san}</span>
                            {pair[1] && <span className="w-16 text-slate-200">{pair[1].san}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
