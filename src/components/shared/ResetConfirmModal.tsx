import { AlertTriangle } from "lucide-react";

interface ResetConfirmModalProps {
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ResetConfirmModal({ onConfirm, onCancel }: ResetConfirmModalProps) {
    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-slate-700 flex gap-3 items-center bg-slate-800/50">
                    <div className="bg-red-500/20 p-2 rounded-full text-red-400">
                        <AlertTriangle size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">Reset Board?</h3>
                </div>
                <div className="p-5">
                    <p className="text-slate-300 text-sm leading-relaxed">
                        Are you sure you want to completely reset the board and clear all history, analysis, and photos? This action cannot be undone.
                    </p>
                </div>
                <div className="p-4 flex justify-end gap-3 border-t border-slate-700/50 bg-slate-900/50">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-md hover:bg-slate-700 hover:text-white transition text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-500/90 text-white rounded-md hover:bg-red-500 transition text-sm font-medium shadow-sm shadow-red-900/20"
                    >
                        Reset Everything
                    </button>
                </div>
            </div>
        </div>
    );
}
