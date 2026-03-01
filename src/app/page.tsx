"use client";

import AnalysisBoard from "@/components/AnalysisBoard";
import BoardScanner from "@/components/BoardScanner";
import { Activity, Camera, Settings, X, AlertTriangle } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"analyzer" | "scanner">("analyzer");
  const { settings, updateSettings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [pendingTab, setPendingTab] = useState<"analyzer" | "scanner" | null>(null);

  const handleTabSwitch = (tab: "analyzer" | "scanner") => {
    if (tab === activeTab) return;
    // Show confirmation before switching
    setPendingTab(tab);
  };

  const confirmTabSwitch = () => {
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans antialiased">
      <div className="max-w-[80rem] mx-auto space-y-6">
        <header className="border-b border-slate-700 pb-4 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
              Matthew&apos;s Treasure Chest
            </h1>
            <p className="text-slate-400 mt-2 text-lg">Scan boards, analyze notation, and review games with AI &amp; Stockfish</p>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 h-fit">
              <button
                onClick={() => handleTabSwitch("analyzer")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition font-medium text-sm ${activeTab === "analyzer"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                  }`}
              >
                <Activity size={18} /> Notation Analyzer
              </button>
              <button
                onClick={() => handleTabSwitch("scanner")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition font-medium text-sm ${activeTab === "scanner"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                  }`}
              >
                <Camera size={18} /> Board Scanner
              </button>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center justify-center p-3 h-fit bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border border-slate-700 rounded-lg transition"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        {activeTab === "analyzer" ? <AnalysisBoard settings={settings} /> : <BoardScanner settings={settings} />}
      </div>

      {/* Tab Switch Confirmation Modal */}
      {pendingTab && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-700 flex items-center gap-3 bg-slate-900">
              <AlertTriangle size={20} className="text-amber-400" />
              <h2 className="text-lg font-bold text-white">Switch Tab?</h2>
            </div>
            <div className="p-5 text-sm text-slate-300 space-y-2">
              <p>
                Switching to <strong className="text-white">{pendingTab === "analyzer" ? "Notation Analyzer" : "Board Scanner"}</strong> will
                reset the current board state and cancel any active parsing jobs.
              </p>
              <p className="text-slate-400">Are you sure you want to continue?</p>
            </div>
            <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setPendingTab(null)}
                className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-md hover:bg-slate-700 hover:text-white transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmTabSwitch}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-500 transition text-sm font-medium shadow-md"
              >
                Switch Tab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <Settings size={20} className="text-indigo-400" />
                Application Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* AI Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">AI Model Settings</h3>

                <div className="space-y-2">
                  <label className="text-sm text-slate-300 font-medium">Gemini API Key (Optional Override)</label>
                  <input
                    type="password"
                    value={settings.geminiApiKey}
                    onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                    placeholder="Defaults to server environment variable"
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-300 font-medium">Model Name</label>
                  <input
                    type="text"
                    value={settings.geminiModel}
                    onChange={(e) => updateSettings({ geminiModel: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-700 rounded-md mt-2">
                  <div>
                    <div className="text-sm font-medium text-slate-200">Fast Mode</div>
                    <div className="text-xs text-slate-400 mt-0.5">Skip bounding boxes for faster transcription</div>
                  </div>
                  <button
                    onClick={() => updateSettings({ fastMode: !settings.fastMode })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.fastMode ? 'bg-indigo-500' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.fastMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* Engine Settings */}
              <div className="space-y-4 pt-4 border-t border-slate-700/50">
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Stockfish Settings</h3>

                <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-700 rounded-md">
                  <div>
                    <div className="text-sm font-medium text-slate-200">Enable Stockfish Analysis</div>
                    <div className="text-xs text-slate-400 mt-0.5">Toggle local engine evaluation</div>
                  </div>
                  <button
                    onClick={() => updateSettings({ stockfishEnabled: !settings.stockfishEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.stockfishEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.stockfishEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-slate-300 font-medium">Search Depth: {settings.stockfishDepth}</label>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    disabled={!settings.stockfishEnabled}
                    value={settings.stockfishDepth}
                    onChange={(e) => updateSettings({ stockfishDepth: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Fast (1)</span>
                    <span>Accurate (20)</span>
                  </div>
                </div>
                {/* Lichess Settings */}
                <div className="space-y-4 pt-4 border-t border-slate-700/50">
                  <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Lichess Integrations</h3>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-300 font-medium">Personal API Token (Optional Override)</label>
                    <input
                      type="password"
                      value={settings.lichessToken}
                      onChange={(e) => updateSettings({ lichessToken: e.target.value })}
                      placeholder="Defaults to server environment variable"
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                    />
                    <div className="text-xs text-slate-500">
                      Required to export games directly to your studies. Generate one at <a href="https://lichess.org/account/oauth/token" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">lichess.org/account/oauth/token</a> with &quot;Read/Write studies&quot; permissions.
                    </div>
                  </div>
                </div>

              </div>

            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition font-medium shadow-md shadow-indigo-900/50"
              >
                Close & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
