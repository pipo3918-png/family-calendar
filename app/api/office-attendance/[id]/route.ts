import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const row = db.prepare("SELECT user_id FROM office_attendance WHERE id = ?").get(Number(id)) as { user_id: number } | undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.user_id !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  db.prepare("DELETE FROM office_attendance WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}
