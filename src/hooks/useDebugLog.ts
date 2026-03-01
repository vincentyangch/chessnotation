import { useState, useCallback } from "react";
import type { DebugLogEntry } from "@/types";

export function useDebugLog() {
    const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
    const [showDebug, setShowDebug] = useState(false);

    const addLog = useCallback((message: string, type: 'info' | 'error' = 'info') => {
        setDebugLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message,
            type
        }]);
    }, []);

    const toggleDebug = useCallback(() => {
        setShowDebug(prev => !prev);
    }, []);

    const clearLogs = useCallback(() => {
        setDebugLogs([]);
    }, []);

    return { debugLogs, showDebug, addLog, toggleDebug, clearLogs };
}
