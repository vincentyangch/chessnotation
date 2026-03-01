import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    let authHeader = req.headers.get('authorization');
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!authHeader) {
        const envToken = process.env.LICHESS_TOKEN;
        if (envToken) authHeader = `Bearer ${envToken}`;
    }

    if (!authHeader) {
        return NextResponse.json({ error: "No Lichess token configured." }, { status: 401 });
    }

    if (!username) {
        return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    try {
        const res = await fetch(`https://lichess.org/api/study/by/${username}`, {
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/x-ndjson'
            }
        });

        if (!res.ok) {
            return NextResponse.json({ error: "Failed to fetch from Lichess API" }, { status: res.status });
        }

        const text = await res.text();
        const lines = text.trim().split('\n');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const studies: any[] = [];
        for (const line of lines) {
            if (line.trim()) {
                try {
                    studies.push(JSON.parse(line));
                } catch (e) {
                    console.error("Failed to parse NDJSON line", line);
                }
            }
        }

        return NextResponse.json(studies);
    } catch (e: unknown) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
