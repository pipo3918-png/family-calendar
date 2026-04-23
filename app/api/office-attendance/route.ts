import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const rows = db.prepare(`
    SELECT oa.id, oa.date, oa.user_id, u.name as user_name, u.color as user_color
    FROM office_attendance oa
    JOIN users u ON oa.user_id = u.id
    ORDER BY oa.date
  `).all() as { id: number; date: string; user_id: number; user_name: string; user_color: string }[];

  const events = rows.map((r) => ({
    id: `attendance-${r.id}`,
    title: r.user_name,
    start: r.date,
    allDay: true,
    backgroundColor: r.user_color,
    borderColor: r.user_color,
    extendedProps: {
      isOfficeAttendance: true,
      attendanceId: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userColor: r.user_color,
    },
  }));

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date } = await req.json();
  if (!date) return NextResponse.json({ error: "日付は必須です" }, { status: 400 });

  const db = getDb();
  try {
    const result = db.prepare(
      "INSERT INTO office_attendance (user_id, date) VALUES (?, ?)"
    ).run(session.userId, date);
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch {
    return NextResponse.json({ error: "すでに登録されています" }, { status: 409 });
  }
}
