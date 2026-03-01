import { useState, useEffect } from "react";
import type { AnalysisResult } from "@/types";

interface UseStockfishAnalysisOptions {
    currentPosition: string;
    stockfishEnabled: boolean;
    stockfishDepth: number;
    addLog?: (message: string, type?: 'info' | 'error') => void;
}

export function useStockfishAnalysis({
    currentPosition,
    stockfishEnabled,
    stockfishDepth,
    addLog,
}: UseStockfishAnalysisOptions) {
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        if (!stockfishEnabled) {
            setAnalysis(null);
            setIsAnalyzing(false);
            return;
        }

        const fetchAnalysis = async (fen: string) => {
            setIsAnalyzing(true);
            setErrorMsg("");
            try {
                addLog?.(`Fetching analysis for FEN: ${fen}`);
                const res = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fen, depth: stockfishDepth })
                });
                if (res.ok) {
                    const data = await res.json();
                    addLog?.(`Analysis successful. Evaluation: ${data.evaluation.comment}`);
                    if (data.evaluation.fen === fen) {
                        setAnalysis(data);
                    }
                } else {
                    setErrorMsg("Analysis failed.");
                    addLog?.(`Analysis completely failed. HTTP ${res.status}`, 'error');
                }
            } catch (e: unknown) {
                setErrorMsg("Failed to connect to engine.");
                const msg = e instanceof Error ? e.message : String(e);
                addLog?.(`Engine connection exception: ${msg}`, 'error');
            } finally {
                setIsAnalyzing(false);
            }
        };

        const timer = setTimeout(() => {
            fetchAnalysis(currentPosition);
        }, 400);
        return () => clearTimeout(timer);
    }, [currentPosition, stockfishEnabled, stockfishDepth, addLog]);

    // Compute eval bar values
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

    const clearAnalysis = () => setAnalysis(null);

    return {
        analysis,
        isAnalyzing,
        errorMsg,
        setErrorMsg,
        evalPercentage,
        evalText,
        clearAnalysis,
    };
}
