import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

type EventRow = {
  id: number;
  title: string;
  start: string;
  end: string | null;
  all_day: number;
  location: string | null;
  late_level: number;
  notes: string | null;
  participants: string | null;
  tentative: number;
  user_id: number;
  user_name: string;
  user_color: string;
  tags_raw: string | null;
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const rows = db.prepare(`
    SELECT e.id, e.title, e.start, e.end, e.all_day,
           e.location, e.late_level, e.notes, e.participants, e.tentative,
           u.id as user_id, u.name as user_name, u.color as user_color,
           GROUP_CONCAT(t.id || ':' || t.name) as tags_raw
    FROM events e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN event_tags et ON e.id = et.event_id
    LEFT JOIN tags t ON et.tag_id = t.id
    GROUP BY e.id
    ORDER BY e.start
  `).all() as EventRow[];

  const events = rows.map((r) => ({
    id: String(r.id),
    title: r.title,
    start: r.start,
    end: r.end ?? undefined,
    allDay: r.all_day === 1,
    backgroundColor: r.user_color,
    borderColor: r.user_color,
    extendedProps: {
      userId: r.user_id,
      userName: r.user_name,
      userColor: r.user_color,
      location: r.location ?? "",
      lateLevel: r.late_level ?? 0,
      notes: r.notes ?? "",
      tentative: r.tentative === 1,
      participants: r.participants ? r.participants.split(",") : [],
      tags: r.tags_raw
        ? r.tags_raw.split(",").map((s) => { const [id, ...rest] = s.split(":"); return { id: Number(id), name: rest.join(":") }; })
        : [],
    },
  }));

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, start, end, allDay, location, lateLevel, notes, participants, tentative, tagIds } = await req.json();
  if (!title || !start) return NextResponse.json({ error: "タイトルと開始日時は必須です" }, { status: 400 });

  const db = getDb();
  const result = db.prepare(
    "INSERT INTO events (title, start, end, all_day, location, late_level, notes, participants, tentative, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(title, start, end ?? null, allDay ? 1 : 0, location || null, lateLevel ?? 0, notes || null,
    Array.isArray(participants) && participants.length > 0 ? participants.join(",") : null,
    tentative ? 1 : 0, session.userId);

  const eventId = result.lastInsertRowid as number;
  if (Array.isArray(tagIds)) {
    const ins = db.prepare("INSERT OR IGNORE INTO event_tags (event_id, tag_id) VALUES (?, ?)");
    for (const tid of tagIds) ins.run(eventId, tid);
  }

  return NextResponse.json({ id: eventId });
}
