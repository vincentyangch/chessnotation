import { useState } from "react";
import { Download, ChevronDown, Copy, BookOpen } from "lucide-react";

interface ExportDropdownProps {
    onCopyPgn: () => void;
    onDownloadPgn: () => void;
    onExportToStudy: () => void;
}

export default function ExportDropdown({ onCopyPgn, onDownloadPgn, onExportToStudy }: ExportDropdownProps) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                onBlur={() => setTimeout(() => setShowMenu(false), 200)}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition text-sm font-medium shadow-md shadow-indigo-900/50"
            >
                <Download size={16} /> Export <ChevronDown size={14} className={`transition-transform duration-200 ${showMenu ? "rotate-180" : ""}`} />
            </button>
            {showMenu && (
                <div className="absolute left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-50 overflow-hidden">
                    <button
                        onClick={() => { onCopyPgn(); setShowMenu(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-700 flex items-center gap-2 text-sm text-slate-200 transition"
                    >
                        <Copy size={16} /> Copy PGN
                    </button>
                    <button
                        onClick={() => { onDownloadPgn(); setShowMenu(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-700 flex items-center gap-2 text-sm text-slate-200 transition"
                    >
                        <Download size={16} /> Download PGN
                    </button>
                    <button
                        onClick={() => { onExportToStudy(); setShowMenu(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-700 flex items-center gap-2 text-sm text-slate-200 transition"
                    >
                        <BookOpen size={16} /> Export to Study
                    </button>
                </div>
            )}
        </div>
    );
}
