"use client";

import { useState, useEffect, useRef } from "react";
import { Chess, Move } from "chess.js";
import { Chessboard } from "react-chessboard";
import { RotateCcw, Undo2, Download, Play, SquareTerminal, Loader2 } from "lucide-react";

type AnalysisResult = {
  bestMove: string;
  evaluation: {
    cp: number;
    mate: number | null;
    comment: string;
    fen: string;
  };
};

export default function AnalysisBoard() {
  const [game, setGame] = useState(new Chess());
  const [currentPosition, setCurrentPosition] = useState(game.fen());
  const [history, setHistory] = useState<Move[]>([]);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(400);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => {
      if (boardWrapperRef.current) {
        setBoardWidth(boardWrapperRef.current.offsetWidth);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch analysis when position changes
  useEffect(() => {
    const fetchAnalysis = async (fen: string) => {
      setIsAnalyzing(true);
      setErrorMsg("");
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fen, depth: 10 }) // moderate depth for speed
        });
        if (res.ok) {
          const data = await res.json();
          // Ensure we are setting analysis for the current fen (ignore race conditions)
          if (data.evaluation.fen === fen) {
            setAnalysis(data);
          }
        } else {
          setErrorMsg("Analysis failed.");
        }
      } catch (e) {
        setErrorMsg("Failed to connect to engine.");
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Delay analysis slightly to avoid spamming
    const timer = setTimeout(() => {
      fetchAnalysis(currentPosition);
    }, 400);
    return () => clearTimeout(timer);
  }, [currentPosition]);

  function makeAMove(move: { from: string; to: string; promotion?: string }) {
    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn());
    try {
      let result = null;
      try {
        // Try strict move without promotion first unless it fails
        result = gameCopy.move({ from: move.from, to: move.to });
      } catch (e) {
        // If it throws, try with promotion
        result = gameCopy.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
      }

      if (result) {
        setGame(gameCopy);
        setCurrentPosition(gameCopy.fen());
        setHistory(gameCopy.history({ verbose: true }) as Move[]);
        setAnalysis(null);
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  function onDrop({ sourceSquare, targetSquare, piece }: any) {
    if (!targetSquare) return false;

    let promo = "q";
    if (typeof piece === 'string' && piece[1]) {
      promo = piece[1].toLowerCase();
    } else if (piece && piece.pieceType && piece.pieceType[1]) {
      promo = piece.pieceType[1].toLowerCase();
    }

    const moveInfo = {
      from: sourceSquare,
      to: targetSquare,
      promotion: promo,
    };
    return makeAMove(moveInfo);
  }

  function undoMove() {
    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn());
    gameCopy.undo();
    setGame(gameCopy);
    setCurrentPosition(gameCopy.fen());
    setHistory(gameCopy.history({ verbose: true }) as Move[]);
    setAnalysis(null);
  }

  function resetGame() {
    const newGame = new Chess();
    setGame(newGame);
    setCurrentPosition(newGame.fen());
    setHistory([]);
    setAnalysis(null);
  }

  function exportPgn() {
    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn());

    // Add standard headers for maximum compatibility with Lichess/Chess.com
    const today = new Date();
    const formattedDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

    gameCopy.header(
      "Event", "Post-game Analysis",
      "Site", "Chess Analyzer App",
      "Date", formattedDate,
      "Round", "-",
      "White", "Player 1",
      "Black", "Player 2",
      "Result", "*"
    );

    const pgn = gameCopy.pgn();
    const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);

    // Explicitly enforce the download to trigger a native file prompt
    const a = document.createElement("a");
    a.style.display = 'none';
    a.href = url;
    a.download = "analysis.pgn";
    // Append to body is required for Firefox, but Chrome needs it too sometimes to trigger the 'save as' dialog
    document.body.appendChild(a);

    // Fire the dispatch explicitly to bypass popup/blob blockers
    if (document.createEvent) {
      const event = document.createEvent('MouseEvents');
      event.initEvent('click', true, true);
      a.dispatchEvent(event);
    } else {
      a.click();
    }

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // Calculate Eval Bar height (0 to 100%)
  // Range from -4 to +4 pawns => 0% to 100%
  let evalPercentage = 50;
  let evalText = "0.0";
  if (analysis) {
    if (analysis.evaluation.mate !== null) {
      evalPercentage = analysis.evaluation.mate > 0 ? 100 : 0;
      evalText = `M${Math.abs(analysis.evaluation.mate)}`;
    } else {
      const cp = analysis.evaluation.cp;
      const cappedCp = Math.max(-400, Math.min(400, cp));
      evalPercentage = 50 + (cappedCp / 400) * 50;
      evalText = (cp > 0 ? "+" : "") + (cp / 100).toFixed(1);
    }
  }

  const whiteHeight = `${evalPercentage}%`;

  const arrowOptions = analysis?.bestMove ? [
    {
      startSquare: analysis.bestMove.substring(0, 2),
      endSquare: analysis.bestMove.substring(2, 4),
      color: "rgba(99, 102, 241, 0.5)"
    }
  ] : undefined;

  if (!isMounted) return <div className="animate-pulse bg-slate-800 rounded-xl h-[600px] w-full" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 flex justify-center w-full relative">
        <div className="flex gap-4 w-full max-w-2xl px-2">

          {/* Evaluation Bar */}
          <div className="w-8 flex-shrink-0 bg-slate-800 rounded-sm border-2 border-slate-700 flex flex-col-reverse overflow-hidden relative shadow-inner">
            <div
              className="w-full bg-slate-200 transition-all duration-500 ease-in-out"
              style={{ height: whiteHeight }}
            />
            {analysis && (
              <div className={`absolute left-0 right-0 py-1 text-center text-[10px] font-bold z-10 ${evalPercentage > 50 ? 'top-1 text-slate-800' : 'bottom-1 text-slate-200'}`}>
                {evalText}
              </div>
            )}
            {/* Middle line marker */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-500/50 -translate-y-1/2" />
          </div>

          <div
            ref={boardWrapperRef}
            className="flex-grow aspect-square shadow-2xl rounded-sm overflow-hidden border-4 border-slate-700 bg-slate-800"
          >
            <Chessboard
              options={{
                id: "BasicBoard",
                position: currentPosition,
                onPieceDrop: onDrop,
                darkSquareStyle: { backgroundColor: "#475569" },
                lightSquareStyle: { backgroundColor: "#cbd5e1" },
                arrows: arrowOptions as any,
                animationDurationInMs: 200
              }}
            />
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl sticky top-8">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-4 bg-slate-900 border-b border-slate-700">
          <button
            onClick={undoMove}
            disabled={history.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-200 rounded-md hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Undo2 size={16} /> Undo
          </button>
          <button
            onClick={resetGame}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-200 rounded-md hover:bg-slate-700 transition text-sm font-medium"
          >
            <RotateCcw size={16} /> Reset
          </button>
          <button
            onClick={exportPgn}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition text-sm font-medium ml-auto shadow-md shadow-indigo-900/50"
          >
            <Download size={16} /> Export
          </button>
        </div>

        {/* Engine output */}
        <div className="p-4 bg-slate-900 border-b border-slate-700">
          <div className="flex items-center gap-2 mb-3 text-indigo-400 font-semibold tracking-wide text-sm uppercase">
            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <SquareTerminal size={16} />}
            <span>Stockfish Analysis</span>
          </div>
          <div className="min-h-16 flex flex-col items-center justify-center p-3 bg-slate-800 rounded-lg text-slate-300 text-sm border border-slate-700 border-dashed">
            {errorMsg ? (
              <span className="text-red-400">{errorMsg}</span>
            ) : analysis ? (
              <div className="w-full text-center space-y-1">
                <div className="font-bold text-lg text-white">{analysis.evaluation.comment}</div>
                <div className="text-slate-400">Best move: <span className="font-mono text-indigo-300">{analysis.bestMove}</span></div>
              </div>
            ) : isAnalyzing ? (
              <span className="text-slate-500 animate-pulse">Analyzing position...</span>
            ) : (
              <span className="text-slate-500">Awaiting move...</span>
            )}
          </div>
        </div>

        {/* Moves history */}
        <div className="flex-1 p-4 overflow-y-auto min-h-[300px] max-h-[400px]">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Move History</h3>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-sm leading-relaxed">
            {history.reduce((result: any[], move: Move, index: number) => {
              if (index % 2 === 0) {
                result.push([move]);
              } else {
                result[result.length - 1].push(move);
              }
              return result;
            }, []).map((movePair: Move[], i: number) => (
              <div key={i} className="contents">
                <div className="text-slate-500 text-right select-none w-8">{(i + 1)}.</div>
                <div className="flex gap-4">
                  <span className="w-16 text-slate-200">{movePair[0].san}</span>
                  {movePair[1] && <span className="w-16 text-slate-200">{movePair[1].san}</span>}
                </div>
              </div>
            ))}
          </div>
          {history.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 mt-12">
              <Play size={24} className="opacity-50" />
              <p className="text-sm">Make a move to start</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
