import { FileText, ChevronUp, ChevronDown } from "lucide-react";
import type { GameMetadata } from "@/types";

interface MetadataEditorProps {
    gameMetadata: GameMetadata | null;
    onChange: (metadata: GameMetadata) => void;
    show: boolean;
    onToggle: () => void;
}

export default function MetadataEditor({ gameMetadata, onChange, show, onToggle }: MetadataEditorProps) {
    return (
        <div className="p-4 bg-slate-900 border-b border-slate-700">
            <button
                onClick={onToggle}
                className="flex items-center justify-between w-full text-left"
            >
                <div className="flex items-center gap-2 text-indigo-400 font-semibold tracking-wide text-sm uppercase">
                    <FileText size={16} />
                    <span>Game Metadata</span>
                    {gameMetadata && Object.values(gameMetadata).some(v => v) && (
                        <span className="ml-2 w-2 h-2 rounded-full bg-emerald-500"></span>
                    )}
                </div>
                {show ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>

            {show && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex flex-col gap-1">
                        <label className="text-slate-400 text-xs font-semibold">White Player</label>
                        <input
                            type="text"
                            value={gameMetadata?.white || ''}
                            onChange={(e) => onChange({ ...gameMetadata, white: e.target.value })}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 outline-none focus:border-indigo-500 transition"
                            placeholder="Player 1"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-slate-400 text-xs font-semibold">Black Player</label>
                        <input
                            type="text"
                            value={gameMetadata?.black || ''}
                            onChange={(e) => onChange({ ...gameMetadata, black: e.target.value })}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 outline-none focus:border-indigo-500 transition"
                            placeholder="Player 2"
                        />
                    </div>
                    <div className="flex flex-col gap-1 sm:col-span-2">
                        <label className="text-slate-400 text-xs font-semibold">Event</label>
                        <input
                            type="text"
                            value={gameMetadata?.event || ''}
                            onChange={(e) => onChange({ ...gameMetadata, event: e.target.value })}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 outline-none focus:border-indigo-500 transition"
                            placeholder="Post-game Analysis"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-slate-400 text-xs font-semibold">Date</label>
                        <input
                            type="text"
                            value={gameMetadata?.date || ''}
                            onChange={(e) => onChange({ ...gameMetadata, date: e.target.value })}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 outline-none focus:border-indigo-500 transition"
                            placeholder="YYYY.MM.DD"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-slate-400 text-xs font-semibold">Round</label>
                        <input
                            type="text"
                            value={gameMetadata?.round || ''}
                            onChange={(e) => onChange({ ...gameMetadata, round: e.target.value })}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 outline-none focus:border-indigo-500 transition"
                            placeholder="-"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
