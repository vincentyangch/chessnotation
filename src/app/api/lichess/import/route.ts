import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const authHeader = req.headers.get('authorization');
    const { searchParams } = new URL(req.url);
    const studyId = searchParams.get('studyId');

    if (!authHeader) {
        return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    if (!studyId) {
        return NextResponse.json({ error: "Missing studyId parameter" }, { status: 400 });
    }

    try {
        const body = await req.json();

        // Build application/x-www-form-urlencoded body for Lichess
        const params = new URLSearchParams();
        params.append('pgn', body.pgn || '');
        if (body.name) {
            params.append('name', body.name);
        }

        const res = await fetch(`https://lichess.org/api/study/${studyId}/import-pgn`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("Failed to import chapter:", errText);
            return NextResponse.json({ error: "Failed to import chapter into Lichess", details: errText }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (e: unknown) {
        console.error("Internal API error proxying import-pgn:", e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
