import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

const PARTICIPANTS = [
  { name: "よた",     color: "#f97316" },
  { name: "たんぺ",   color: "#8b5cf6" },
  { name: "マントウ", color: "#10b981" },
];

type EventRow = {
  participants: string | null;
  late_level: number;
  tags_raw: string | null;
  start: string;
  end: string | null;
  all_day: number;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year  = Number(searchParams.get("year")  || new Date().getFullYear());
  const month = Number(searchParams.get("month") || new Date().getMonth() + 1);

  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const toDate = new Date(year, month, 1);
  const to = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, "0")}-01`;

  const db = getDb();
  const rows = db.prepare(`
    SELECT e.participants, e.late_level, e.start, e.end, e.all_day,
           GROUP_CONCAT(t.name) as tags_raw
    FROM events e
    LEFT JOIN event_tags et ON e.id = et.event_id
    LEFT JOIN tags t ON et.tag_id = t.id
    WHERE e.start >= ? AND e.start < ?
    GROUP BY e.id
  `).all(from, to) as EventRow[];

  // 参加者ごとに集計
  const stats = PARTICIPANTS.map((p) => {
    const myEvents = rows.filter((r) =>
      r.participants ? r.participants.split(",").includes(p.name) : false
    );

    // タグ集計
    const tagCount: Record<string, number> = {};
    for (const ev of myEvents) {
      if (!ev.tags_raw) continue;
      for (const tag of ev.tags_raw.split(",")) {
        tagCount[tag] = (tagCount[tag] ?? 0) + 1;
      }
    }
    const tags = Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 帰宅遅延集計
    const lateBreakdown: Record<number, number> = {};
    for (const ev of myEvents) {
      if (ev.late_level > 0) {
        lateBreakdown[ev.late_level] = (lateBreakdown[ev.late_level] ?? 0) + 1;
      }
    }

    // 合計時間（分）
    let totalMinutes = 0;
    for (const ev of myEvents) {
      if (!ev.all_day && ev.end) {
        const diff = Math.round((new Date(ev.end).getTime() - new Date(ev.start).getTime()) / 60000);
        if (diff > 0) totalMinutes += diff;
      }
    }

    return { name: p.name, color: p.color, total: myEvents.length, totalMinutes, tags, lateBreakdown };
  });

  return NextResponse.json({ year, month, participants: stats });
}
