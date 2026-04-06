import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import getDb from "@/lib/db";
import { createToken, COOKIE_NAME } from "@/lib/auth";

const COLORS = [
  "#4f46e5", "#db2777", "#059669", "#d97706",
  "#dc2626", "#7c3aed", "#0891b2", "#65a30d",
];

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "全項目を入力してください" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "パスワードは6文字以上にしてください" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスは既に使われています" }, { status: 400 });
  }

  const count = (db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number }).n;
  const color = COLORS[count % COLORS.length];
  const hash = await bcrypt.hash(password, 10);

  const result = db
    .prepare("INSERT INTO users (name, email, password_hash, color) VALUES (?, ?, ?, ?)")
    .run(name, email, hash, color);

  const token = await createToken(result.lastInsertRowid as number);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
