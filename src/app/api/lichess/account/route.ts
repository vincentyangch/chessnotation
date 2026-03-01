import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    let authHeader = req.headers.get('authorization');

    // Fall back to server environment variable if no client token provided
    if (!authHeader) {
        const envToken = process.env.LICHESS_TOKEN;
        if (envToken) {
            authHeader = `Bearer ${envToken}`;
        }
    }

    if (!authHeader) {
        return NextResponse.json({ error: "No Lichess token configured. Set LICHESS_TOKEN env var or add one in Settings." }, { status: 401 });
    }

    try {
        const res = await fetch('https://lichess.org/api/account', {
            headers: {
                'Authorization': authHeader,
            }
        });

        if (!res.ok) {
            return NextResponse.json({ error: "Failed to fetch from Lichess API" }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
