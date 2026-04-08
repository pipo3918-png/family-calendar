"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TagStat = { name: string; count: number };
type ParticipantStat = {
  name: string;
  color: string;
  total: number;
  tags: TagStat[];
  lateBreakdown: Record<number, number>;
};
type Report = { year: number; month: number; participants: ParticipantStat[] };

const TAG_PALETTE = [
  "#ff6b6b","#ff922b","#ffd43b","#51cf66","#339af0",
  "#cc5de8","#f783ac","#20c997","#748ffc","#a9e34b",
];

const LATE_LABELS: Record<number, { label: string; icon: string; color: string }> = {
  1: { label: "少し遅い",   icon: "🌛", color: "#fbbf24" },
  2: { label: "かなり遅い", icon: "🌚", color: "#f97316" },
};

export default function ReportPage() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const res = await fetch(`/api/report?year=${y}&month=${m}`);
    if (res.status === 401) { router.replace("/login"); return; }
    if (res.ok) setReport(await res.json());
    setLoading(false);
  }, [router]);

  useEffect(() => { load(year, month); }, [load, year, month]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const maxTotal = Math.max(1, ...(report?.participants.map(p => p.total) ?? []));

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-white/80 backdrop-blur border-b border-sky-100 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl select-none">🌿</span>
          <span className="font-black tracking-tight text-sky-700 text-lg">
            wapicoco <span className="text-sky-400 font-light">calendar</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/calendar" className="text-xs font-semibold text-sky-500 hover:text-sky-700 transition-colors px-3 py-1.5 rounded-full hover:bg-sky-50">
            カレンダー
          </Link>
          <span className="text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-teal-400 px-3 py-1.5 rounded-full">
            レポート
          </span>
        </div>
      </header>

      <div className="flex-1 px-5 py-6 max-w-2xl mx-auto w-full">
        {/* 月切替 */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-full bg-white border-2 border-sky-100 text-sky-500 hover:border-sky-300 transition-colors font-bold text-lg">
            ‹
          </button>
          <h2 className="text-xl font-black text-sky-800 tracking-tight">{new Date(year, month - 1).toLocaleDateString("en-US", { year: "numeric", month: "long" })}</h2>
          <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-full bg-white border-2 border-sky-100 text-sky-500 hover:border-sky-300 transition-colors font-bold text-lg">
            ›
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-300 text-sm">読み込み中...</div>
        ) : !report || report.participants.every(p => p.total === 0) ? (
          <div className="text-center py-20 text-gray-300">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-sm font-medium">この月の予定はありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 参加者ごとの件数比較バー */}
            <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-sky-500 uppercase tracking-widest mb-4">参加した予定の件数</h3>
              <div className="space-y-3">
                {report.participants.map((p) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className="w-20 shrink-0 flex items-center gap-1.5">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white font-black shrink-0"
                        style={{ backgroundColor: p.color, fontSize: "11px" }}
                      >
                        {p.name[0]}
                      </span>
                      <span className="text-sm font-semibold text-gray-700 truncate">{p.name}</span>
                    </div>
                    <div className="flex-1 h-7 bg-gray-50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center px-3 transition-all duration-500"
                        style={{
                          width: p.total === 0 ? "0%" : `${Math.max(8, (p.total / maxTotal) * 100)}%`,
                          backgroundColor: p.color,
                          opacity: 0.85,
                        }}
                      >
                        {p.total > 0 && <span className="text-white text-xs font-black">{p.total}</span>}
                      </div>
                    </div>
                    {p.total === 0 && <span className="text-xs text-gray-300">0件</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* 個人カード */}
            {report.participants.filter(p => p.total > 0).map((p) => (
              <div key={p.name} className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 flex items-center gap-3" style={{ borderLeft: `4px solid ${p.color}` }}>
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name[0]}
                  </span>
                  <div>
                    <p className="font-bold text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400">合計 <span className="font-bold text-gray-600">{p.total}</span> 件</p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 space-y-4">
                  {p.tags.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">タグ内訳</p>
                      <div className="flex flex-wrap gap-2">
                        {p.tags.map((t, i) => {
                          const bg = TAG_PALETTE[i % TAG_PALETTE.length];
                          return (
                            <div key={t.name} className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: bg + "20", border: `1.5px solid ${bg}40` }}>
                              <span className="text-xs font-bold" style={{ color: bg }}>{t.name}</span>
                              <span className="text-xs font-black px-1.5 py-px rounded-full text-white" style={{ backgroundColor: bg }}>{t.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {Object.keys(p.lateBreakdown).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">帰宅が遅くなった日</p>
                      <div className="flex flex-wrap gap-2">
                        {([1, 2] as const).map((level) => {
                          const count = p.lateBreakdown[level];
                          if (!count) return null;
                          const info = LATE_LABELS[level];
                          return (
                            <div key={level} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border-2" style={{ borderColor: info.color + "40", backgroundColor: info.color + "15" }}>
                              <span>{info.icon}</span>
                              <span className="text-xs font-bold" style={{ color: info.color }}>{info.label}</span>
                              <span className="text-xs font-black px-1.5 py-px rounded-full text-white" style={{ backgroundColor: info.color }}>{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {p.tags.length === 0 && Object.keys(p.lateBreakdown).length === 0 && (
                    <p className="text-xs text-gray-300">タグ・帰宅情報なし</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
