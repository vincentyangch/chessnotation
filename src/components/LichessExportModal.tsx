import { useState, useEffect } from "react";
import { Loader2, X, AlertTriangle, ExternalLink, Plus, BookOpen, User } from "lucide-react";
import { AppSettings } from "@/app/page";

interface LichessExportModalProps {
    settings: AppSettings;
    pgn: string;
    onClose: () => void;
    defaultChapterName?: string;
}

interface LichessAccount {
    id: string;
    username: string;
}

interface LichessStudy {
    id: string;
    name: string;
    updatedAt?: number;
}

export default function LichessExportModal({ settings, pgn, onClose, defaultChapterName = "Imported Game" }: LichessExportModalProps) {
    const [status, setStatus] = useState<"loading_account" | "loading_studies" | "ready" | "importing" | "success" | "error">("loading_account");
    const [errorMsg, setErrorMsg] = useState("");

    // Auth & Account
    const [account, setAccount] = useState<LichessAccount | null>(null);
    const [studies, setStudies] = useState<LichessStudy[]>([]);

    // Form Selection
    const [selectedStudyId, setSelectedStudyId] = useState<string>("");
    const [chapterName, setChapterName] = useState<string>(defaultChapterName);

    // Success URL
    const [studyUrl, setStudyUrl] = useState<string>("");

    useEffect(() => {
        if (!settings.lichessToken) {
            setStatus("error");
            setErrorMsg("No Lichess API Token found. Please add one in Application Settings.");
            return;
        }

        const fetchAccount = async () => {
            try {
                const res = await fetch('/api/lichess/account', {
                    headers: { 'Authorization': `Bearer ${settings.lichessToken}` }
                });
                if (!res.ok) throw new Error("Invalid token or Lichess API unreachable");
                const data = await res.json();
                setAccount(data);
                setStatus("loading_studies");
                fetchStudies(data.username);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (err) {
                setStatus("error");
                setErrorMsg("Failed to authenticate with Lichess. Check your API token.");
            }
        };

        const fetchStudies = async (username: string) => {
            try {
                const res = await fetch(`/api/lichess/studies?username=${username}`, {
                    headers: { 'Authorization': `Bearer ${settings.lichessToken}` }
                });
                if (!res.ok) throw new Error("Failed to fetch studies");
                const data = await res.json();
                setStudies(data);
                if (data.length > 0) {
                    setSelectedStudyId(data[0].id);
                }
                setStatus("ready");
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (err) {
                setStatus("error");
                setErrorMsg("Failed to fetch your Lichess studies.");
            }
        };

        fetchAccount();
    }, [settings.lichessToken]);

    const handleExport = async () => {
        setStatus("importing");
        setErrorMsg("");

        try {
            if (!selectedStudyId) {
                throw new Error("Please select a study first.");
            }

            // Import PGN as chapter
            const importRes = await fetch(`/api/lichess/import?studyId=${selectedStudyId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${settings.lichessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pgn, name: chapterName })
            });

            if (!importRes.ok) throw new Error("Failed to import chapter into study");

            setStudyUrl(`https://lichess.org/study/${selectedStudyId}`);
            setStatus("success");

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
            setStatus("error");
            setErrorMsg("An error occurred during export. Make sure your Token has 'Read/Write studies' permissions.");
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all overflow-y-auto">
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                        <BookOpen size={18} className="text-blue-400" />
                        Export to Lichess Study
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Status & Loader */}
                    {(status === "loading_account" || status === "loading_studies" || status === "importing") && (
                        <div className="flex flex-col items-center justify-center py-8 text-blue-400 space-y-3">
                            <Loader2 size={32} className="animate-spin" />
                            <span className="text-sm font-medium">
                                {status === "loading_account" && "Authenticating with Lichess..."}
                                {status === "loading_studies" && "Fetching your studies..."}
                                {status === "importing" && "Exporting chapter to Lichess..."}
                            </span>
                        </div>
                    )}

                    {/* Error State */}
                    {status === "error" && (
                        <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-4 flex gap-3 text-red-400 items-start">
                            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                            <div className="text-sm leading-relaxed">{errorMsg}</div>
                        </div>
                    )}

                    {/* Success State */}
                    {status === "success" && (
                        <div className="flex flex-col items-center justify-center py-6 space-y-4">
                            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30">
                                <BookOpen size={28} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-white mb-1">Export Successful!</h3>
                                <p className="text-sm text-slate-400 mb-4">Your analysis has been added to the Lichess study as a new chapter.</p>
                                <a
                                    href={studyUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition shadow-lg shadow-blue-900/30"
                                >
                                    Open Study in Lichess <ExternalLink size={16} />
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Ready/Form State */}
                    {(status === "ready" || status === "error") && account && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                                <User size={16} className="text-slate-400" />
                                Authenticated as <span className="font-bold text-white">{account.username}</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300">Target Study</label>
                                <div className="relative">
                                    <select
                                        value={selectedStudyId}
                                        onChange={(e) => setSelectedStudyId(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500 appearance-none transition"
                                    >
                                        {studies.length === 0 && <option value="" disabled>No studies found</option>}
                                        {studies.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        ▼
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300">Chapter Name</label>
                                <input
                                    type="text"
                                    value={chapterName}
                                    onChange={(e) => setChapterName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition"
                                    placeholder="Chapter 1"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-md hover:bg-slate-700 hover:text-white transition font-medium"
                    >
                        {status === "success" ? "Close" : "Cancel"}
                    </button>
                    {(status === "ready" || status === "error") && account && (
                        <button
                            onClick={handleExport}
                            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition font-medium shadow-md shadow-blue-900/50 flex items-center gap-2"
                        >
                            <Plus size={16} /> Export to Study
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
