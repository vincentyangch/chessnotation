import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
        return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
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
    } catch (e: unknown) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
