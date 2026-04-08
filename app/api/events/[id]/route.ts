import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { title, start, end, allDay, location, lateLevel, notes, participants, tentative, tagIds } = await req.json();

  const db = getDb();
  const event = db.prepare("SELECT user_id FROM events WHERE id = ?").get(Number(id)) as { user_id: number } | undefined;
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.prepare(
    "UPDATE events SET title=?, start=?, end=?, all_day=?, location=?, late_level=?, notes=?, participants=?, tentative=?, updated_at=datetime('now') WHERE id=?"
  ).run(title, start, end ?? null, allDay ? 1 : 0, location || null, lateLevel ?? 0, notes || null,
    Array.isArray(participants) && participants.length > 0 ? participants.join(",") : null,
    tentative ? 1 : 0, Number(id));

  if (Array.isArray(tagIds)) {
    db.prepare("DELETE FROM event_tags WHERE event_id = ?").run(Number(id));
    const ins = db.prepare("INSERT OR IGNORE INTO event_tags (event_id, tag_id) VALUES (?, ?)");
    for (const tid of tagIds) ins.run(Number(id), tid);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const event = db.prepare("SELECT user_id FROM events WHERE id = ?").get(Number(id)) as { user_id: number } | undefined;
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.prepare("DELETE FROM events WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}
