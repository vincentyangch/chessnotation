"use client";

import { useState, useEffect, useRef } from "react";
import { Chess, Move } from "chess.js";
import { Chessboard } from "react-chessboard";
import { RotateCcw, Undo2, Download, Play, SquareTerminal, Loader2, Upload, Check, SkipForward, X, Image as ImageIcon, ImageOff, Bug, Zap, AlertTriangle, ExternalLink, ChevronDown, Copy, FileText, ChevronUp } from "lucide-react";

type AnalysisResult = {
  bestMove: string;
  evaluation: {
    cp: number;
    mate: number | null;
    comment: string;
    fen: string;
  };
};

type ParsedMove = {
  move: string;
  box: [number, number, number, number]; // [ymin, xmin, ymax, xmax] scaled 0-1000
};

interface GameMetadata {
  event?: string;
  date?: string;
  round?: string;
  white?: string;
  black?: string;
}

import { AppSettings } from "@/app/page";

export default function AnalysisBoard({ settings }: { settings: AppSettings }) {
  const [game, setGame] = useState(new Chess());
  const [currentPosition, setCurrentPosition] = useState(game.fen());
  const [history, setHistory] = useState<Move[]>([]);

  // Metadata from parsed image
  const [gameMetadata, setGameMetadata] = useState<GameMetadata | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Debug mode state
  const [debugLogs, setDebugLogs] = useState<{ time: string, message: string, type: 'info' | 'error' }[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const addLog = (message: string, type: 'info' | 'error' = 'info') => {
    setDebugLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      message,
      type
    }]);
  };

  // Parsing state
  const [parsedMoves, setParsedMoves] = useState<ParsedMove[]>([]);
  const [currentParsedIndex, setCurrentParsedIndex] = useState(0);
  const [isParsingImage, setIsParsingImage] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showImagePanel, setShowImagePanel] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(400);
  const [isMounted, setIsMounted] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

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
    if (!settings.stockfishEnabled) {
      setAnalysis(null);
      setIsAnalyzing(false);
      return;
    }

    const fetchAnalysis = async (fen: string) => {
      setIsAnalyzing(true);
      setErrorMsg("");
      try {
        addLog(`Fetching analysis for FEN: ${fen}`);
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fen, depth: settings.stockfishDepth })
        });
        if (res.ok) {
          const data = await res.json();
          addLog(`Analysis successful. Evaluation: ${data.evaluation.comment}`);
          // Ensure we are setting analysis for the current fen (ignore race conditions)
          if (data.evaluation.fen === fen) {
            setAnalysis(data);
          }
        } else {
          setErrorMsg("Analysis failed.");
          addLog(`Analysis completely failed. HTTP ${res.status}`, 'error');
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        setErrorMsg("Failed to connect to engine.");
        addLog(`Engine connection exception: ${e.message}`, 'error');
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Delay analysis slightly to avoid spamming
    const timer = setTimeout(() => {
      fetchAnalysis(currentPosition);
    }, 400);
    return () => clearTimeout(timer);
  }, [currentPosition, settings.stockfishEnabled, settings.stockfishDepth]);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  function handleResetClick() {
    if (history.length > 0 || uploadedImage || parsedMoves.length > 0) {
      setShowResetConfirm(true);
    } else {
      executeReset();
    }
  }

  function executeReset() {
    const newGame = new Chess();
    setGame(newGame);
    setCurrentPosition(newGame.fen());
    setHistory([]);
    setAnalysis(null);
    setParsedMoves([]);
    setCurrentParsedIndex(0);
    setUploadedImage(null);
    setShowResetConfirm(false);
    setGameMetadata(null);
  }

  function exportPgn() {
    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn());

    // Add standard headers for maximum compatibility with Lichess/Chess.com
    const today = new Date();
    const formattedDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

    gameCopy.header(
      "Event", gameMetadata?.event || "Post-game Analysis",
      "Site", "Chess Analyzer App",
      "Date", gameMetadata?.date || formattedDate,
      "Round", gameMetadata?.round || "-",
      "White", gameMetadata?.white || "Player 1",
      "Black", gameMetadata?.black || "Player 2",
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

  function copyPgn() {
    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn());

    const today = new Date();
    const formattedDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

    gameCopy.header(
      "Event", gameMetadata?.event || "Post-game Analysis",
      "Site", "Chess Analyzer App",
      "Date", gameMetadata?.date || formattedDate,
      "Round", gameMetadata?.round || "-",
      "White", gameMetadata?.white || "Player 1",
      "Black", gameMetadata?.black || "Player 2",
      "Result", "*"
    );

    const pgn = gameCopy.pgn();
    navigator.clipboard.writeText(pgn).then(() => {
      addLog("PGN copied to clipboard", "info");
    }).catch(err => {
      setErrorMsg("Failed to copy PGN");
      addLog(`Failed to copy PGN: ${err.message}`, "error");
    });
  }

  function exportToLichess() {
    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn());

    const today = new Date();
    const formattedDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

    gameCopy.header(
      "Event", gameMetadata?.event || "Post-game Analysis",
      "Site", "Chess Analyzer App",
      "Date", gameMetadata?.date || formattedDate,
      "Round", gameMetadata?.round || "-",
      "White", gameMetadata?.white || "Player 1",
      "Black", gameMetadata?.black || "Player 2",
      "Result", "*"
    );

    const pgn = gameCopy.pgn();

    // Create a hidden form to submit a POST request to Lichess
    const form = document.createElement("form");
    form.action = "https://lichess.org/import";
    form.method = "post";
    form.target = "_blank";

    const input = document.createElement("textarea"); // textarea can handle multi-line strings better
    input.name = "pgn";
    input.value = pgn;
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
      document.body.removeChild(form);
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

  // Parsing logic
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingImage(true);
    setErrorMsg("");

    try {
      addLog(`Reading file: ${file.name} (${file.size} bytes)`);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;

        addLog(`Sending image to Gemini parsing API...`);
        const res = await fetch('/api/parse-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64data,
            mimeType: file.type,
            fastMode: settings.fastMode,
            apiKey: settings.geminiApiKey,
            model: settings.geminiModel
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.moves && Array.isArray(data.moves)) {
            addLog(`Successfully parsed ${data.moves.length} moves.`);
            setParsedMoves(data.moves);

            if (data.metadata) {
              setGameMetadata(data.metadata);
              addLog(`Found game metadata: ${JSON.stringify(data.metadata)}`, "info");
            }

            setCurrentParsedIndex(0);
            setUploadedImage(base64data);
            setShowImagePanel(true);
            if (data.moves.length === 0) {
              setErrorMsg("No moves found in the image.");
              addLog("Gemini returned successfully but found 0 moves.", 'info');
            }
          } else {
            setErrorMsg("Failed to parse moves from the image.");
            addLog(`Incorrect JSON payload structure returned from API.`, 'error');
          }
        } else {
          const errData = await res.json();
          setErrorMsg(errData.error || "Failed to parse image.");
          addLog(`API error during parse: ${errData.error || res.statusText}`, 'error');
        }
        setIsParsingImage(false);
      };
      reader.readAsDataURL(file);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setErrorMsg("Error uploading image.");
      addLog(`File upload/parse exception: ${e.message}`, 'error');
      setIsParsingImage(false);
    }

    // reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const acceptParsedMove = () => {
    if (currentParsedIndex < parsedMoves.length) {
      const parsed = parsedMoves[currentParsedIndex];
      const move = parsed.move;

      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      try {
        const result = gameCopy.move(move);
        if (result) {
          setGame(gameCopy);
          setCurrentPosition(gameCopy.fen());
          setHistory(gameCopy.history({ verbose: true }) as Move[]);
          setAnalysis(null);
          setCurrentParsedIndex(prev => prev + 1);
        } else {
          setErrorMsg(`Failed to play move: ${move}. Please make the move manually.`);
        }
      } catch (e) {
        setErrorMsg(`Invalid move generated: ${move}. Please make the move manually.`);
      }
    }
  };

  const skipParsedMove = () => {
    if (currentParsedIndex < parsedMoves.length) {
      setCurrentParsedIndex(prev => prev + 1);
    }
  };

  const revertParsedMove = () => {
    if (currentParsedIndex > 0) {
      setCurrentParsedIndex(prev => prev - 1);
    }
  };

  const cancelParsedReview = () => {
    setParsedMoves([]);
    setCurrentParsedIndex(0);
    setUploadedImage(null);
  };

  const arrowOptions = analysis?.bestMove ? [
    {
      startSquare: analysis.bestMove.substring(0, 2),
      endSquare: analysis.bestMove.substring(2, 4),
      color: "rgba(99, 102, 241, 0.5)"
    }
  ] : undefined;

  if (!isMounted) return <div className="animate-pulse bg-slate-800 rounded-xl h-[600px] w-full" />;

  // Compute bounding box style for the current parsed move
  let activeBoxStyle = {};
  if (uploadedImage && showImagePanel && parsedMoves.length > 0 && currentParsedIndex < parsedMoves.length) {
    const box = parsedMoves[currentParsedIndex].box;
    if (box && box.length === 4) {
      const [ymin, xmin, ymax, xmax] = box; // 0-1000 scaled format
      const paddingY = 1.0; // 1% vertical padding
      const paddingX = 2.0; // 2% horizontal padding
      const top = Math.max(0, (ymin / 1000) * 100 - paddingY);
      const left = Math.max(0, (xmin / 1000) * 100 - paddingX);
      const height = ((ymax - ymin) / 1000) * 100 + (paddingY * 2);
      const width = ((xmax - xmin) / 1000) * 100 + (paddingX * 2);
      activeBoxStyle = {
        top: `${top}%`,
        left: `${left}%`,
        height: `${height}%`,
        width: `${width}%`,
      };
    }
  }

  return (
    <div className={`grid grid-cols-1 ${uploadedImage && showImagePanel ? 'xl:grid-cols-4 lg:grid-cols-3' : 'lg:grid-cols-3'} gap-6 items-start transition-all duration-300`}>
      <div className={`${uploadedImage && showImagePanel ? 'xl:col-span-2 lg:col-span-1' : 'lg:col-span-2'} flex justify-center w-full relative`}>
        <div className="flex gap-4 w-full max-w-2xl px-2">

          {/* Evaluation Bar */}
          <div className="w-8 flex-shrink-0 bg-slate-800 rounded-sm border-2 border-slate-700 flex flex-col-reverse overflow-hidden relative shadow-inner">
            <div
              className="w-full bg-slate-200 transition-all duration-500 ease-in-out"
              style={{ height: whiteHeight }}
            />
            <div className={`absolute left-0 right-0 py-1 text-center text-xs font-bold z-10 mix-blend-difference text-white ${evalPercentage >= 50 ? 'top-1' : 'bottom-1'}`}>
              {evalText}
            </div>
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            onClick={handleResetClick}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-200 rounded-md hover:bg-slate-700 transition text-sm font-medium"
          >
            <RotateCcw size={16} /> Reset
          </button>
          <div className="flex-1" />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          {uploadedImage && (
            <button
              onClick={() => setShowImagePanel(!showImagePanel)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-md hover:bg-slate-700 transition text-sm font-medium mr-2"
              title={showImagePanel ? "Hide photo panel" : "Show photo panel"}
            >
              {showImagePanel ? <ImageOff size={16} className="text-slate-400" /> : <ImageIcon size={16} className="text-indigo-400" />}
            </button>
          )}
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-md hover:bg-slate-700 transition text-sm font-medium mr-2"
            title="Toggle Debug Console"
          >
            <Bug size={16} className={showDebug ? "text-emerald-400" : "text-slate-400"} />
          </button>


          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsingImage}
            className="flex items-center gap-2 px-3 py-2 bg-amber-600/20 text-amber-500 border border-amber-600/30 rounded-md hover:bg-amber-600/30 transition text-sm font-medium mr-2"
          >
            {isParsingImage ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {isParsingImage ? "Parsing..." : "Upload Photo"}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              onBlur={() => setTimeout(() => setShowExportMenu(false), 200)}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition text-sm font-medium shadow-md shadow-indigo-900/50"
            >
              <Download size={16} /> Export <ChevronDown size={14} className={`transition-transform duration-200 ${showExportMenu ? "rotate-180" : ""}`} />
            </button>
            {showExportMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => { copyPgn(); setShowExportMenu(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-700 flex items-center gap-2 text-sm text-slate-200 transition"
                >
                  <Copy size={16} /> Copy PGN
                </button>
                <button
                  onClick={() => { exportPgn(); setShowExportMenu(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-700 flex items-center gap-2 text-sm text-slate-200 transition"
                >
                  <Download size={16} /> Download PGN
                </button>
                <button
                  onClick={() => { exportToLichess(); setShowExportMenu(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-700 flex items-center gap-2 text-sm text-slate-200 transition"
                >
                  <ExternalLink size={16} /> Open in Lichess
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Review Mode Panel */}
        {parsedMoves.length > 0 && currentParsedIndex < parsedMoves.length && (
          <div className="p-4 bg-amber-900/20 border-b border-amber-500/20">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2 text-amber-500 font-semibold tracking-wide text-sm uppercase">
                <SquareTerminal size={16} />
                <span>Review Notation</span>
              </div>
              <button onClick={cancelParsedReview} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-slate-800 rounded-lg border border-amber-500/30">
              <div className="text-sm text-slate-400 mb-1">
                Move {Math.floor(currentParsedIndex / 2) + 1}
                {currentParsedIndex % 2 === 0 ? " (White)" : " (Black)"}
              </div>
              <div className="text-2xl font-bold text-white mb-4">
                {parsedMoves[currentParsedIndex]?.move}
              </div>
              <div className="flex gap-2 w-full">
                <button
                  onClick={revertParsedMove}
                  disabled={currentParsedIndex === 0}
                  className="flex-1 flex justify-center items-center gap-2 py-2 bg-slate-700 text-slate-200 rounded hover:bg-slate-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Undo2 size={18} /> Prev
                </button>
                <button
                  onClick={acceptParsedMove}
                  className="flex-[2] flex justify-center items-center gap-2 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500 transition font-medium"
                >
                  <Check size={18} /> Accept
                </button>
                <button
                  onClick={skipParsedMove}
                  className="flex-1 flex justify-center items-center gap-2 py-2 bg-slate-700 text-slate-200 rounded hover:bg-slate-600 transition font-medium"
                >
                  <SkipForward size={18} /> Skip
                </button>
              </div>
              <div className="text-xs text-slate-500 mt-3 text-center">
                Or make the correct move manually on the board.
              </div>
            </div>
          </div>
        )}

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

        {/* Metadata Editor */}
        <div className="p-4 bg-slate-900 border-b border-slate-700">
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2 text-indigo-400 font-semibold tracking-wide text-sm uppercase">
              <FileText size={16} />
              <span>Game Metadata</span>
              {gameMetadata && Object.values(gameMetadata).some(v => v) && (
                <span className="ml-2 w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </div>
            {showMetadata ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
          </button>

          {showMetadata && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 text-xs font-semibold">White Player</label>
                <input
                  type="text"
                  value={gameMetadata?.white || ''}
                  onChange={(e) => setGameMetadata({ ...gameMetadata, white: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 outline-none focus:border-indigo-500 transition"
                  placeholder="Player 1"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 text-xs font-semibold">Black Player</label>
                <input
                  type="text"
                  value={gameMetadata?.black || ''}
                  onChange={(e) => setGameMetadata({ ...gameMetadata, black: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 outline-none focus:border-indigo-500 transition"
                  placeholder="Player 2"
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-slate-400 text-xs font-semibold">Event</label>
                <input
                  type="text"
                  value={gameMetadata?.event || ''}
                  onChange={(e) => setGameMetadata({ ...gameMetadata, event: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 outline-none focus:border-indigo-500 transition"
                  placeholder="Post-game Analysis"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 text-xs font-semibold">Date</label>
                <input
                  type="text"
                  value={gameMetadata?.date || ''}
                  onChange={(e) => setGameMetadata({ ...gameMetadata, date: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 outline-none focus:border-indigo-500 transition"
                  placeholder="YYYY.MM.DD"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 text-xs font-semibold">Round</label>
                <input
                  type="text"
                  value={gameMetadata?.round || ''}
                  onChange={(e) => setGameMetadata({ ...gameMetadata, round: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 outline-none focus:border-indigo-500 transition"
                  placeholder="-"
                />
              </div>
            </div>
          )}
        </div>

        {/* Debug Console */}
        {showDebug ? (
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
        ) : (
          <div className="flex-1 p-4 overflow-y-auto min-h-[300px] max-h-[400px]">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Move History</h3>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-sm leading-relaxed">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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
        )}
      </div>

      {/* Image Display Panel */}
      {uploadedImage && showImagePanel && (
        <div className="flex flex-col bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl sticky top-8 xl:col-span-1 lg:col-span-1 h-[max(600px,calc(100vh-8rem))]">
          <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-semibold text-slate-200">Notation Sheet</h3>
            <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded">
              {parsedMoves.length} moves parsed
            </span>
          </div>
          <div className="flex-1 relative overflow-auto p-4 flex items-start justify-center">
            <div className="relative inline-block max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedImage}
                alt="Notation Sheet"
                className="max-w-full h-auto rounded-md object-contain border border-slate-600"
              />
              {/* Bounding Box Highlight */}
              {currentParsedIndex < parsedMoves.length && (
                <div
                  className="absolute border-2 border-red-500 bg-red-500/20 rounded shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-300 z-10"
                  style={activeBoxStyle}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
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
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-md hover:bg-slate-700 hover:text-white transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={executeReset}
                className="px-4 py-2 bg-red-500/90 text-white rounded-md hover:bg-red-500 transition text-sm font-medium shadow-sm shadow-red-900/20"
              >
                Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
