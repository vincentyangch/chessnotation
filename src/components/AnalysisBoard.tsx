"use client";

import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { RotateCcw, Undo2, Upload, Loader2, SquareTerminal, ImageOff, Image as ImageIcon, Bug } from "lucide-react";
import { useBoardResize } from "@/hooks/useBoardResize";
import { useChessGame } from "@/hooks/useChessGame";
import { useStockfishAnalysis } from "@/hooks/useStockfishAnalysis";
import { useImageParser } from "@/hooks/useImageParser";
import { useDebugLog } from "@/hooks/useDebugLog";
import EvalBar from "./analysis/EvalBar";
import MoveHistory from "./analysis/MoveHistory";
import ReviewPanel from "./analysis/ReviewPanel";
import MetadataEditor from "./analysis/MetadataEditor";
import DebugConsole from "./analysis/DebugConsole";
import ResetConfirmModal from "./shared/ResetConfirmModal";
import ImagePanel from "./shared/ImagePanel";
import ExportDropdown from "./shared/ExportDropdown";
import LichessExportModal from "./LichessExportModal";
import type { AppSettings } from "@/types";

export default function AnalysisBoard({ settings }: { settings: AppSettings }) {
  const { boardWrapperRef, isMounted } = useBoardResize();
  const { debugLogs, showDebug, addLog, toggleDebug } = useDebugLog();

  const {
    currentPosition,
    history,
    gameMetadata,
    setGameMetadata,
    makeAMove,
    undoMove,
    resetGame,
    loadMoveFromSan,
    getFormattedPgn,
    exportPgn,
    copyPgn,
  } = useChessGame();

  const {
    analysis,
    isAnalyzing,
    errorMsg,
    setErrorMsg,
    evalPercentage,
    evalText,
    clearAnalysis,
  } = useStockfishAnalysis({
    currentPosition,
    stockfishEnabled: settings.stockfishEnabled,
    stockfishDepth: settings.stockfishDepth,
    addLog,
  });

  const {
    parsedMoves,
    currentParsedIndex,
    isParsingImage,
    uploadedImage,
    showImagePanel,
    setShowImagePanel,
    fileInputRef,
    handleFileUpload,
    acceptParsedMove,
    skipParsedMove,
    revertParsedMove,
    cancelParsedReview,
    resetParser,
    triggerFileInput,
    activeBoxStyle,
  } = useImageParser({
    settings,
    onMoveParsed: (_moves, metadata) => {
      if (metadata) setGameMetadata(metadata);
    },
    addLog,
  });

  const [showMetadata, setShowMetadata] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLichessModal, setShowLichessModal] = useState(false);

  // Handle piece drops on the board
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onDrop({ sourceSquare, targetSquare, piece }: any) {
    if (!targetSquare) return false;

    let promo = "q";
    if (typeof piece === 'string' && piece[1]) {
      promo = piece[1].toLowerCase();
    }

    const result = makeAMove({ from: sourceSquare, to: targetSquare, promotion: promo });
    if (result) clearAnalysis();
    return result;
  }

  function handleUndoMove() {
    undoMove();
    clearAnalysis();
  }

  function handleResetClick() {
    if (history.length > 0 || uploadedImage || parsedMoves.length > 0) {
      setShowResetConfirm(true);
    } else {
      executeReset();
    }
  }

  function executeReset() {
    resetGame();
    clearAnalysis();
    resetParser();
    setShowResetConfirm(false);
  }

  // Handle accepting a parsed move — apply it to the game
  function handleAcceptParsedMove() {
    const move = acceptParsedMove();
    if (move) {
      const success = loadMoveFromSan(move.move);
      if (success) {
        clearAnalysis();
      } else {
        setErrorMsg(`Failed to play move: ${move.move}. Please make the move manually.`);
      }
    }
  }

  function handleCopyPgn() {
    copyPgn().then(() => {
      addLog("PGN copied to clipboard", "info");
    }).catch(err => {
      setErrorMsg("Failed to copy PGN");
      addLog(`Failed to copy PGN: ${err.message}`, "error");
    });
  }

  const arrowOptions = analysis?.bestMove ? [
    {
      startSquare: analysis.bestMove.substring(0, 2),
      endSquare: analysis.bestMove.substring(2, 4),
      color: "rgba(99, 102, 241, 0.5)"
    }
  ] : undefined;

  if (!isMounted) return <div className="animate-pulse bg-slate-800 rounded-xl h-[600px] w-full" />;

  return (
    <div className={`grid grid-cols-1 ${uploadedImage && showImagePanel ? 'xl:grid-cols-4 lg:grid-cols-3' : 'lg:grid-cols-3'} gap-6 items-start transition-all duration-300`}>
      <div className={`${uploadedImage && showImagePanel ? 'xl:col-span-2 lg:col-span-1' : 'lg:col-span-2'} flex justify-center w-full relative`}>
        <div className="flex gap-4 w-full max-w-2xl px-2">
          <EvalBar evalPercentage={evalPercentage} evalText={evalText} />
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
            onClick={handleUndoMove}
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
            onClick={toggleDebug}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-md hover:bg-slate-700 transition text-sm font-medium mr-2"
            title="Toggle Debug Console"
          >
            <Bug size={16} className={showDebug ? "text-emerald-400" : "text-slate-400"} />
          </button>
          <button
            onClick={triggerFileInput}
            disabled={isParsingImage}
            className="flex items-center gap-2 px-3 py-2 bg-amber-600/20 text-amber-500 border border-amber-600/30 rounded-md hover:bg-amber-600/30 transition text-sm font-medium mr-2"
          >
            {isParsingImage ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {isParsingImage ? "Parsing..." : "Upload Photo"}
          </button>
          <ExportDropdown
            onCopyPgn={handleCopyPgn}
            onDownloadPgn={exportPgn}
            onExportToStudy={() => setShowLichessModal(true)}
          />
        </div>

        {/* Review Mode Panel */}
        <ReviewPanel
          parsedMoves={parsedMoves}
          currentParsedIndex={currentParsedIndex}
          onAccept={handleAcceptParsedMove}
          onSkip={skipParsedMove}
          onRevert={revertParsedMove}
          onCancel={cancelParsedReview}
        />

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
        <MetadataEditor
          gameMetadata={gameMetadata}
          onChange={setGameMetadata}
          show={showMetadata}
          onToggle={() => setShowMetadata(!showMetadata)}
        />

        {/* Debug Console or Move History */}
        {showDebug ? (
          <DebugConsole debugLogs={debugLogs} />
        ) : (
          <MoveHistory history={history} />
        )}
      </div>

      {/* Image Display Panel */}
      {uploadedImage && showImagePanel && (
        <ImagePanel
          image={uploadedImage}
          title="Notation Sheet"
          badgeText={`${parsedMoves.length} moves parsed`}
          activeBoxStyle={activeBoxStyle}
          showBox={currentParsedIndex < parsedMoves.length}
        />
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <ResetConfirmModal
          onConfirm={executeReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      {/* Lichess Export Modal */}
      {showLichessModal && (
        <LichessExportModal
          settings={settings}
          pgn={getFormattedPgn()}
          onClose={() => setShowLichessModal(false)}
          defaultChapterName={`${gameMetadata?.white || 'Player 1'} vs ${gameMetadata?.black || 'Player 2'}`}
        />
      )}
    </div>
  );
}
