import { useState, useCallback } from "react";
import { Chess, Move } from "chess.js";
import type { GameMetadata } from "@/types";

export function useChessGame() {
    const [game, setGame] = useState(new Chess());
    const [currentPosition, setCurrentPosition] = useState(game.fen());
    const [history, setHistory] = useState<Move[]>([]);
    const [gameMetadata, setGameMetadata] = useState<GameMetadata | null>(null);

    const syncState = useCallback((g: Chess) => {
        setGame(g);
        setCurrentPosition(g.fen());
        setHistory(g.history({ verbose: true }) as Move[]);
    }, []);

    const makeAMove = useCallback((move: { from: string; to: string; promotion?: string }) => {
        const gameCopy = new Chess();
        gameCopy.loadPgn(game.pgn());
        try {
            let result = null;
            try {
                result = gameCopy.move({ from: move.from, to: move.to });
            } catch {
                result = gameCopy.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
            }

            if (result) {
                syncState(gameCopy);
                return true;
            }
        } catch {
            return false;
        }
        return false;
    }, [game, syncState]);

    const undoMove = useCallback(() => {
        const gameCopy = new Chess();
        gameCopy.loadPgn(game.pgn());
        gameCopy.undo();
        syncState(gameCopy);
    }, [game, syncState]);

    const resetGame = useCallback(() => {
        const newGame = new Chess();
        syncState(newGame);
        setGameMetadata(null);
    }, [syncState]);

    const loadMoveFromSan = useCallback((san: string): boolean => {
        const gameCopy = new Chess();
        gameCopy.loadPgn(game.pgn());
        try {
            const result = gameCopy.move(san);
            if (result) {
                syncState(gameCopy);
                return true;
            }
        } catch {
            return false;
        }
        return false;
    }, [game, syncState]);

    const getFormattedPgn = useCallback(() => {
        const gameCopy = new Chess();
        gameCopy.loadPgn(game.pgn());

        const today = new Date();
        let formattedDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

        if (gameMetadata?.date) {
            const parsedDate = new Date(gameMetadata.date);
            if (!isNaN(parsedDate.getTime())) {
                formattedDate = `${parsedDate.getFullYear()}.${String(parsedDate.getMonth() + 1).padStart(2, '0')}.${String(parsedDate.getDate()).padStart(2, '0')}`;
            }
        }

        gameCopy.header(
            "Event", gameMetadata?.event || "Post-game Analysis",
            "Site", "Matthew's Treasure Chest",
            "Date", formattedDate,
            "Round", gameMetadata?.round || "-",
            "White", gameMetadata?.white || "Player 1",
            "Black", gameMetadata?.black || "Player 2",
            "Result", "*"
        );

        return gameCopy.pgn();
    }, [game, gameMetadata]);

    const exportPgn = useCallback(() => {
        const pgn = getFormattedPgn();
        const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.style.display = 'none';
        a.href = url;
        a.download = "analysis.pgn";
        document.body.appendChild(a);

        if (document.createEvent) {
            const event = document.createEvent('MouseEvents');
            event.initEvent('click', true, true);
            a.dispatchEvent(event);
        } else {
            a.click();
        }

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }, [getFormattedPgn]);

    const copyPgn = useCallback((): Promise<void> => {
        const pgn = getFormattedPgn();
        return navigator.clipboard.writeText(pgn);
    }, [getFormattedPgn]);

    return {
        game,
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
    };
}
