"use client";

import { useRef, useState, useEffect, useSyncExternalStore } from "react";

// Simple external store for isMounted — avoids setState-in-effect
function subscribe(callback: () => void) {
    // Already mounted by the time useEffect runs
    callback();
    return () => { };
}

export function useBoardResize() {
    const boardWrapperRef = useRef<HTMLDivElement>(null);
    const [boardWidth, setBoardWidth] = useState(400);

    // Use useSyncExternalStore pattern to avoid setState in effect for isMounted
    const isMounted = useSyncExternalStore(
        subscribe,
        () => true,  // client: mounted
        () => false  // server: not mounted
    );

    useEffect(() => {
        const handleResize = () => {
            if (boardWrapperRef.current) {
                setBoardWidth(boardWrapperRef.current.offsetWidth);
            }
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return { boardWrapperRef, boardWidth, isMounted };
}
