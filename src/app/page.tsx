import AnalysisBoard from "@/components/AnalysisBoard";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans antialiased">
      <div className="max-w-[80rem] mx-auto space-y-6">
        <header className="border-b border-slate-700 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
              Chess Analyzer
            </h1>
            <p className="text-slate-400 mt-2 text-lg">Review and analyze your chess games with Stockfish</p>
          </div>
        </header>

        <AnalysisBoard />
      </div>
    </main>
  );
}
