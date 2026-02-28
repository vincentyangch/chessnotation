"use client";

import { useState } from "react";
import AnalysisBoard from "@/components/AnalysisBoard";
import BoardScanner from "@/components/BoardScanner";
import { Activity, Camera } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"analyzer" | "scanner">("analyzer");

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans antialiased">
      <div className="max-w-[80rem] mx-auto space-y-6">
        <header className="border-b border-slate-700 pb-4 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
              Chess Analyzer
            </h1>
            <p className="text-slate-400 mt-2 text-lg">Review and analyze your chess games with Stockfish</p>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 h-fit">
            <button
              onClick={() => setActiveTab("analyzer")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition font-medium text-sm ${activeTab === "analyzer"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                }`}
            >
              <Activity size={18} /> Notation Analyzer
            </button>
            <button
              onClick={() => setActiveTab("scanner")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition font-medium text-sm ${activeTab === "scanner"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                }`}
            >
              <Camera size={18} /> Board Scanner
            </button>
          </div>
        </header>

        {activeTab === "analyzer" ? <AnalysisBoard /> : <BoardScanner />}
      </div>
    </main>
  );
}
