"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { AppSettings } from "@/types";
import { defaultSettings } from "@/types";

const STORAGE_KEY = "chess-analyzer-settings";

// Read settings from localStorage synchronously (for useSyncExternalStore)
function getSnapshot(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

function getServerSnapshot(): string | null {
    return null;
}

// Listeners for storage changes
let listeners: (() => void)[] = [];

function subscribe(callback: () => void) {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter(l => l !== callback);
    };
}

function emitChange() {
    for (const listener of listeners) {
        listener();
    }
}

export function useSettings() {
    const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const settings: AppSettings = stored
        ? { ...defaultSettings, ...JSON.parse(stored) }
        : defaultSettings;

    const updateSettings = useCallback((updates: Partial<AppSettings>) => {
        const current = getSnapshot();
        const currentSettings: AppSettings = current
            ? { ...defaultSettings, ...JSON.parse(current) }
            : defaultSettings;
        const newSettings = { ...currentSettings, ...updates };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        } catch {
            // Ignore storage errors
        }
        emitChange();
    }, []);

    return { settings, updateSettings };
}
