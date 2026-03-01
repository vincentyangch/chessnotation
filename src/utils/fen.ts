/**
 * Directly mutates a FEN string to place or remove a piece on a square.
 * Bypasses chess.js validation — used for board editor / scanner mode.
 */
export function modifyFen(fen: string, square: string, charToPlace: ' ' | string): string {
    try {
        const parts = fen.split(' ');
        const board = parts[0].split('/');

        const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = 8 - parseInt(square[1], 10);

        const rankStr = board[rank];
        let expanded = '';
        for (let i = 0; i < rankStr.length; i++) {
            if (/[1-8]/.test(rankStr[i])) {
                expanded += ' '.repeat(parseInt(rankStr[i]));
            } else {
                expanded += rankStr[i];
            }
        }

        const newExpanded = expanded.substring(0, file) + charToPlace + expanded.substring(file + 1);

        let newRankStr = '';
        let emptyCount = 0;
        for (let i = 0; i < newExpanded.length; i++) {
            if (newExpanded[i] === ' ') {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    newRankStr += emptyCount;
                    emptyCount = 0;
                }
                newRankStr += newExpanded[i];
            }
        }
        if (emptyCount > 0) {
            newRankStr += emptyCount;
        }

        board[rank] = newRankStr;
        parts[0] = board.join('/');
        return parts.join(' ');
    } catch {
        return fen;
    }
}
