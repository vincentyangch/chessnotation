import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(req: Request) {
    try {
        const { fen, depth = 12 } = await req.json();

        if (!fen) {
            return NextResponse.json({ error: "FEN is required" }, { status: 400 });
        }

        return await new Promise<Response>((resolve) => {
            // Using npx circumvents Next.js Turbopack file tracing errors for spawn inputs
            const engine = spawn('npx', ['stockfish']);

            let bestMove = "";
            let scoreCp = 0;
            let mate: number | null = null;
            let messageLog: string[] = [];
            let resolved = false;

            engine.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');

                for (const line of lines) {
                    const text = line.trim();
                    if (!text) continue;
                    messageLog.push(text);

                    if (text.startsWith('info') && text.includes('score')) {
                        const scoreMatch = text.match(/score cp (-?\d+)/);
                        if (scoreMatch) {
                            scoreCp = parseInt(scoreMatch[1], 10);
                            mate = null;
                        }
                        const mateMatch = text.match(/score mate (-?\d+)/);
                        if (mateMatch) {
                            mate = parseInt(mateMatch[1], 10);
                            scoreCp = 0;
                        }
                    }

                    if (text.startsWith('bestmove')) {
                        bestMove = text.split(' ')[1];
                        engine.stdin.write('quit\n');

                        let comment = "Equal position.";
                        if (mate !== null) {
                            comment = mate > 0 ? `White mates in ${mate}` : `Black mates in ${Math.abs(mate)}`;
                        } else {
                            const evalPawn = scoreCp / 100;
                            if (evalPawn > 2) comment = "White is winning.";
                            else if (evalPawn < -2) comment = "Black is winning.";
                            else if (evalPawn > 0.5) comment = "White is slightly better.";
                            else if (evalPawn < -0.5) comment = "Black is slightly better.";
                        }

                        if (!resolved) {
                            resolved = true;
                            resolve(NextResponse.json({
                                bestMove,
                                evaluation: {
                                    cp: scoreCp,
                                    mate: mate,
                                    comment: comment,
                                    fen: fen
                                }
                            }));
                        }
                    }
                }
            });

            engine.stderr.on('data', (data) => {
                console.error("Stockfish Error:", data.toString());
            });

            engine.stdin.write("uci\n");
            engine.stdin.write(`position fen ${fen}\n`);
            engine.stdin.write(`go depth ${depth}\n`);

            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    engine.kill();
                    resolve(NextResponse.json({ error: "Engine timeout", logs: messageLog }, { status: 500 }));
                }
            }, 5000);
        });
    } catch (error: any) {
        return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
    }
}
