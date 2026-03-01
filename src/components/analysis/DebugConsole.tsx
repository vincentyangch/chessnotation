import { Bug } from "lucide-react";
import type { DebugLogEntry } from "@/types";

interface DebugConsoleProps {
    debugLogs: DebugLogEntry[];
}

export default function DebugConsole({ debugLogs }: DebugConsoleProps) {
    return (
        <div className="flex-1 p-4 bg-slate-950 overflow-y-auto max-h-[400px] border-t border-slate-700 font-mono text-xs">
            <h3 className="font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Bug size={14} /> Debug Console
            </h3>
            {debugLogs.length === 0 ? (
                <span className="text-slate-600">No logs yet...</span>
            ) : (
                <ul className="space-y-1">
                    {debugLogs.map((log, i) => (
                        <li key={i} className={`flex gap-3 py-1 border-b border-white/5 ${log.type === 'error' ? 'text-red-400 bg-red-950/20' : 'text-slate-300'}`}>
                            <span className="text-slate-500 shrink-0 w-16">{log.time}</span>
                            <span className="break-words">{log.message}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
