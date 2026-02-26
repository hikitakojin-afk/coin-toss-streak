import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DB_PATH = path.join(process.cwd(), "leaderboard.json")

function readDB() {
    if (!fs.existsSync(DB_PATH)) return []
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"))
    } catch (e) {
        return []
    }
}

function writeDB(data: any) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

export async function GET() {
    return NextResponse.json(readDB())
}

export async function POST(req: Request) {
    try {
        const { username, score } = await req.json()

        if (!username || typeof score !== "number" || score <= 0) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 })
        }

        let db = readDB()
        const existingIndex = db.findIndex((x: any) => x.username === username)

        if (existingIndex > -1) {
            if (score > db[existingIndex].score) {
                db[existingIndex].score = score
                db[existingIndex].updatedAt = new Date().toISOString()
            }
        } else {
            db.push({
                username,
                score,
                updatedAt: new Date().toISOString()
            })
        }

        // Sort descending and keep top 100
        db.sort((a: any, b: any) => b.score - a.score)
        db = db.slice(0, 100)

        writeDB(db)
        return NextResponse.json({ success: true, leaderboard: db })
    } catch (e) {
        return NextResponse.json({ error: "Server Error" }, { status: 500 })
    }
}

// AddDELETE endpoint for debug
export async function DELETE() {
    try {
        writeDB([]) // Empty the leaderboard
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: "Server Error" }, { status: 500 })
    }
}
