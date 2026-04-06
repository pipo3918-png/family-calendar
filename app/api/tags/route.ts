import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const tags = db.prepare("SELECT id, name FROM tags ORDER BY id").all();
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "タグ名を入力してください" }, { status: 400 });

  const db = getDb();
  const existing = db.prepare("SELECT id FROM tags WHERE name = ?").get(name.trim());
  if (existing) return NextResponse.json({ error: "同じ名前のタグが既にあります" }, { status: 400 });

  const result = db.prepare("INSERT INTO tags (name) VALUES (?)").run(name.trim());
  return NextResponse.json({ id: result.lastInsertRowid, name: name.trim() });
}
