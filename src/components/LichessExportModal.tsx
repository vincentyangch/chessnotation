import { useState, useEffect } from "react";
import { Loader2, X, AlertTriangle, ExternalLink, Plus, BookOpen, User } from "lucide-react";
import type { AppSettings, LichessAccount, LichessStudy } from "@/types";

interface LichessExportModalProps {
    settings: AppSettings;
    pgn: string;
    onClose: () => void;
    defaultChapterName?: string;
}

export default function LichessExportModal({ settings, pgn, onClose, defaultChapterName = "Imported Game" }: LichessExportModalProps) {
    const [account, setAccount] = useState<LichessAccount | null>(null);
    const [studies, setStudies] = useState<LichessStudy[]>([]);
    const [selectedStudyId, setSelectedStudyId] = useState("");
    const [chapterName, setChapterName] = useState(defaultChapterName);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        const fetchAccount = async () => {
            try {
                const headers: Record<string, string> = {};
                if (settings.lichessToken) headers['Authorization'] = `Bearer ${settings.lichessToken}`;
                const res = await fetch('/api/lichess/account', { headers });
                if (res.ok) {
                    const data = await res.json();
                    setAccount({ id: data.id, username: data.username });
                    return data.username;
                } else {
                    setError("Failed to authenticate with Lichess. Check your token.");
                    return null;
                }
            } catch {
                setError("Failed to connect to Lichess.");
                return null;
            }
        };

        const fetchStudies = async (username: string) => {
            try {
                const headers: Record<string, string> = {};
                if (settings.lichessToken) headers['Authorization'] = `Bearer ${settings.lichessToken}`;
                const res = await fetch(`/api/lichess/studies?username=${username}`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    const sorted = data
                        .map((s: { id: string; name: string; updatedAt?: number }) => ({
                            id: s.id,
                            name: s.name,
                            updatedAt: s.updatedAt
                        }))
                        .sort((a: LichessStudy, b: LichessStudy) => (b.updatedAt || 0) - (a.updatedAt || 0));
                    setStudies(sorted);
                    if (sorted.length > 0) {
                        setSelectedStudyId(sorted[0].id);
                    }
                } else {
                    setError("Failed to fetch studies.");
                }
            } catch {
                setError("Failed to connect to Lichess.");
            }
        };

        (async () => {
            const username = await fetchAccount();
            if (username) {
                await fetchStudies(username);
            }
            setIsLoading(false);
        })();
    }, [settings.lichessToken]);

    const handleExport = async () => {
        if (!selectedStudyId) {
            setError("Please select a study.");
            return;
        }

        setIsExporting(true);
        setError("");

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (settings.lichessToken) headers['Authorization'] = `Bearer ${settings.lichessToken}`;
            const res = await fetch(`/api/lichess/import?studyId=${selectedStudyId}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ pgn, name: chapterName })
            });

            if (res.ok) {
                setSuccess(`Chapter "${chapterName}" exported successfully!`);
            } else {
                const errData = await res.json();
                setError(errData.error || "Failed to export to Lichess.");
            }
        } catch {
            setError("Failed to connect to Lichess.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                        <BookOpen size={20} className="text-blue-400" />
                        Export to Lichess Study
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={24} className="animate-spin text-indigo-400" />
                            <span className="ml-3 text-slate-400">Connecting to Lichess...</span>
                        </div>
                    ) : (
                        <>
                            {account && (
                                <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-700">
                                    <User size={16} className="text-emerald-400" />
                                    <span>Signed in as <strong className="text-white">{account.username}</strong></span>
                                </div>
                            )}

                            {studies.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-300 font-medium">Select Study</label>
                                    <select
                                        value={selectedStudyId}
                                        onChange={(e) => setSelectedStudyId(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                                    >
                                        {studies.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm text-slate-300 font-medium">Chapter Name</label>
                                <input
                                    type="text"
                                    value={chapterName}
                                    onChange={(e) => setChapterName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                                    placeholder="Chapter name"
                                />
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="p-3 bg-red-900/40 border border-red-500/50 rounded text-sm text-red-400 flex items-start gap-2">
                            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-emerald-900/40 border border-emerald-500/50 rounded text-sm text-emerald-400">
                            {success}
                            {selectedStudyId && (
                                <a
                                    href={`https://lichess.org/study/${selectedStudyId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 mt-2 text-blue-400 hover:underline"
                                >
                                    <ExternalLink size={14} /> Open in Lichess
                                </a>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-md hover:bg-slate-700 hover:text-white transition text-sm font-medium"
                    >
                        {success ? "Close" : "Cancel"}
                    </button>
                    {!success && (
                        <button
                            onClick={handleExport}
                            disabled={isExporting || isLoading || !selectedStudyId}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition text-sm font-medium shadow-md shadow-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            {isExporting ? "Exporting..." : "Add Chapter"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
