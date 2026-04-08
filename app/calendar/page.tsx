"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg, EventDropArg, EventChangeArg, EventContentArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import Link from "next/link";
import TimePicker from "@/components/TimePicker";

type User = { id: number; name: string; email: string; color: string };
type Tag = { id: number; name: string };
type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    userId: number;
    userName: string;
    userColor: string;
    location: string;
    lateLevel: number;
    notes: string;
    participants: string[];
    tentative: boolean;
    tags: Tag[];
  };
};

type ModalState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; event: CalendarEvent };

// タグカラーパレット（IDの順番で循環）
const TAG_PALETTE = [
  { bg: "#ff6b6b", text: "#fff", light: "#fff5f5" },
  { bg: "#ff922b", text: "#fff", light: "#fff4e6" },
  { bg: "#ffd43b", text: "#664400", light: "#fffce8" },
  { bg: "#51cf66", text: "#fff", light: "#ebfbee" },
  { bg: "#339af0", text: "#fff", light: "#e7f5ff" },
  { bg: "#cc5de8", text: "#fff", light: "#f8f0fc" },
  { bg: "#f783ac", text: "#fff", light: "#fff0f6" },
  { bg: "#20c997", text: "#fff", light: "#e6fcf5" },
  { bg: "#748ffc", text: "#fff", light: "#edf2ff" },
  { bg: "#a9e34b", text: "#334400", light: "#f4fce3" },
];

function tagColor(id: number) {
  return TAG_PALETTE[(id - 1) % TAG_PALETTE.length];
}

// 固定参加者
const PARTICIPANTS: { name: string; color: string }[] = [
  { name: "よた",   color: "#f97316" },
  { name: "たんぺ", color: "#8b5cf6" },
  { name: "マントウ", color: "#10b981" },
];

const LATE_LEVELS = [
  { level: 0, label: "通常", icon: "🏠", color: "bg-gray-100 text-gray-500 border-gray-200" },
  { level: 1, label: "少し遅い", icon: "🌛", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { level: 2, label: "かなり遅い", icon: "🌚", color: "bg-orange-100 text-orange-700 border-orange-200" },
];

function fmtTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function splitDateTime(dt: string): { date: string; time: string } {
  if (!dt) return { date: "", time: "" };
  if (dt.length === 10) return { date: dt, time: "" };
  return { date: dt.slice(0, 10), time: dt.slice(11, 16) };
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function roundTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const rounded = Math.round(m / 15) * 15;
  if (rounded === 60) return `${String(h + 1).padStart(2, "0")}:00`;
  return `${String(h).padStart(2, "0")}:${String(rounded).padStart(2, "0")}`;
}

function isoToLocal(isoStr: string): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CalendarPage() {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const eventClickedRef = useRef(false);
  const [me, setMe] = useState<User | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });

  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formAllDay, setFormAllDay] = useState(false);
  const [formLocation, setFormLocation] = useState("");
  const [formLateLevel, setFormLateLevel] = useState(0);
  const [formNotes, setFormNotes] = useState("");
  const [formParticipants, setFormParticipants] = useState<string[]>([]);
  const [formTentative, setFormTentative] = useState(false);
  const [formTagIds, setFormTagIds] = useState<number[]>([]);
  const [formError, setFormError] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    fetch("/api/me").then((r) => {
      if (r.status === 401) { router.replace("/login"); return; }
      return r.json().then(setMe);
    });
  }, [router]);

  const loadEvents = useCallback(async () => {
    const r = await fetch("/api/events");
    if (r.ok) setEvents(await r.json());
  }, []);

  const loadTags = useCallback(async () => {
    const r = await fetch("/api/tags");
    if (r.ok) setAllTags(await r.json());
  }, []);

  useEffect(() => { loadEvents(); loadTags(); }, [loadEvents, loadTags]);

  function resetForm() {
    setFormTitle(""); setFormDate(""); setFormStartTime("");
    setFormEndDate(""); setFormEndTime(""); setFormAllDay(false);
    setFormLocation(""); setFormLateLevel(0); setFormNotes(""); setFormParticipants([]); setFormTentative(false); setFormTagIds([]);
    setFormError(""); setNewTagName(""); setAddingTag(false);
  }

  function openCreate(info: DateSelectArg) {
    resetForm();
    const date = info.startStr.slice(0, 10);
    setFormDate(date); setFormEndDate(date);
    if (info.allDay) {
      setFormStartTime("18:30");
      setFormEndTime("22:30");
    } else {
      const s = splitDateTime(isoToLocal(info.startStr));
      const e = splitDateTime(isoToLocal(info.endStr));
      setFormStartTime(roundTime(s.time));
      setFormEndTime(roundTime(e.time));
      setFormEndDate(e.date || date);
    }
    setModal({ mode: "create" });
  }

  function openCreateFromDateClick(info: DateClickArg) {
    if (eventClickedRef.current) return;
    resetForm();
    const date = info.dateStr.slice(0, 10);
    setFormDate(date); setFormEndDate(date);
    setFormStartTime("18:30");
    setFormEndTime("22:30");
    setFormAllDay(false);
    setModal({ mode: "create" });
  }

  function openEdit(info: EventClickArg) {
    eventClickedRef.current = true;
    setTimeout(() => { eventClickedRef.current = false; }, 300);
    const ev = events.find((e) => e.id === info.event.id);
    if (!ev) return;
    resetForm();
    setFormTitle(ev.title);
    setFormAllDay(ev.allDay);
    if (ev.allDay) {
      setFormDate(ev.start.slice(0, 10));
      setFormEndDate(ev.end ? addDays(ev.end.slice(0, 10), -1) : ev.start.slice(0, 10));
    } else {
      const s = splitDateTime(isoToLocal(ev.start));
      const e = ev.end ? splitDateTime(isoToLocal(ev.end)) : { date: s.date, time: "" };
      setFormDate(s.date); setFormStartTime(s.time);
      setFormEndDate(e.date); setFormEndTime(e.time);
    }
    setFormLocation(ev.extendedProps.location);
    setFormLateLevel(ev.extendedProps.lateLevel);
    setFormNotes(ev.extendedProps.notes);
    setFormParticipants(ev.extendedProps.participants);
    setFormTentative(ev.extendedProps.tentative);
    setFormTagIds(ev.extendedProps.tags.map((t) => t.id));
    setModal({ mode: "edit", event: ev });
  }

  function handleAllDayToggle(allDay: boolean) {
    setFormAllDay(allDay);
    if (!allDay && !formStartTime) {
      setFormStartTime("18:30");
      setFormEndTime("22:30");
    }
  }

  function toggleTag(id: number) {
    setFormTagIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleAddTag() {
    if (!newTagName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim() }),
    });
    if (!res.ok) { setFormError((await res.json()).error); return; }
    const tag = await res.json() as Tag;
    await loadTags();
    setFormTagIds((prev) => [...prev, tag.id]);
    setNewTagName(""); setAddingTag(false);
  }

  async function handleDeleteTag(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/tags/${id}`, { method: "DELETE" });
    setFormTagIds((prev) => prev.filter((x) => x !== id));
    loadTags();
  }

  async function handleSave() {
    setFormError("");
    if (!formTitle.trim()) { setFormError("タイトルを入力してください"); return; }
    if (!formDate) { setFormError("日付を入力してください"); return; }

    const body = {
      title: formTitle.trim(),
      start: formAllDay ? formDate : `${formDate}T${formStartTime || "00:00"}`,
      end: formAllDay ? addDays(formEndDate || formDate, 1) : (formEndTime ? `${formEndDate || formDate}T${formEndTime}` : null),
      allDay: formAllDay,
      location: formLocation || null,
      lateLevel: formLateLevel,
      notes: formNotes || null,
      participants: formParticipants,
      tentative: formTentative,
      tagIds: formTagIds,
    };

    const url = modal.mode === "edit" ? `/api/events/${modal.event.id}` : "/api/events";
    const method = modal.mode === "edit" ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { setFormError((await res.json()).error); return; }
    setModal({ mode: "closed" }); loadEvents();
  }

  async function handleDelete() {
    if (modal.mode !== "edit") return;
    if (!confirm("この予定を削除しますか？")) return;
    const res = await fetch(`/api/events/${modal.event.id}`, { method: "DELETE" });
    if (!res.ok) { setFormError((await res.json()).error); return; }
    setModal({ mode: "closed" }); loadEvents();
  }

  async function handleEventDrop(info: EventDropArg) {
    const ev = events.find((e) => e.id === info.event.id);
    if (!ev) return;
    const res = await fetch(`/api/events/${info.event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: info.event.title,
        start: info.event.startStr,
        end: info.event.endStr || null,
        allDay: info.event.allDay,
        location: ev.extendedProps.location || null,
        lateLevel: ev.extendedProps.lateLevel,
        notes: ev.extendedProps.notes || null,
        participants: ev.extendedProps.participants,
        tentative: ev.extendedProps.tentative,
        tagIds: ev.extendedProps.tags.map((t) => t.id),
      }),
    });
    if (!res.ok) info.revert();
    loadEvents();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  function renderEventContent(info: EventContentArg) {
    const { participants, tentative, tags } = info.event.extendedProps as CalendarEvent["extendedProps"];
    const eventParticipants = PARTICIPANTS.filter((p) => participants?.includes(p.name));
    const color = info.event.backgroundColor;
    const isAllDay = info.event.allDay;
    return (
      <div
        className="px-1 py-0.5 w-full rounded"
        style={isAllDay ? { backgroundColor: color + "28", color } : {}}
      >
        <div className="flex items-center gap-1 flex-wrap">
          {/* 参加者アバター */}
          {eventParticipants.length > 0 ? (
            <div className="flex -space-x-1 shrink-0">
              {eventParticipants.map((p) => (
                <span
                  key={p.name}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white font-black border border-white leading-none"
                  style={{ backgroundColor: p.color, fontSize: "8px" }}
                  title={p.name}
                >
                  {p.name[0]}
                </span>
              ))}
            </div>
          ) : null}
          <span className="text-xs font-semibold leading-tight break-words">
            {tentative && (
              <span className="mr-0.5 bg-amber-400 text-white rounded px-0.5 font-black" style={{ fontSize: "9px" }}>?</span>
            )}
            {!isAllDay && info.event.start && (
              <span className="opacity-75 mr-0.5 font-normal">
                {fmtTime(info.event.start)}
                {info.event.end ? `–${fmtTime(info.event.end)}` : ""}
              </span>
            )}
            {info.event.title}
          </span>
        </div>
        {tags?.length > 0 && (
          <div className="flex gap-0.5 mt-0.5 flex-wrap">
            {tags.slice(0, 3).map((t: Tag) => {
              const c = tagColor(t.id);
              return (
                <span
                  key={t.id}
                  className="text-[9px] px-1.5 py-px rounded-full font-bold leading-tight"
                  style={{ backgroundColor: c.bg, color: c.text, opacity: 0.9 }}
                >
                  {t.name}
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const canEdit = (modal.mode === "create" || modal.mode === "edit") && me !== null;

  const inputCls = (disabled?: boolean) =>
    `w-full border-2 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none transition-colors ${
      disabled ? "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed" : "border-sky-100 focus:border-sky-400 text-gray-800"
    }`;
  const labelCls = "block text-xs font-bold uppercase tracking-widest mb-1.5";

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-white/80 backdrop-blur border-b border-sky-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl select-none">🌿</span>
          <span className="font-black tracking-tight text-sky-700 text-base">
            wapicoco <span className="text-sky-400 font-light hidden sm:inline">calendar</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-teal-400 px-3 py-1.5 rounded-full">
            カレンダー
          </span>
          <Link href="/report" className="text-xs font-semibold text-sky-500 px-3 py-1.5 rounded-full hover:bg-sky-50">
            レポート
          </Link>
          {me && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-sky-50 rounded-full px-2.5 py-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: me.color }} />
                <span className="text-xs font-semibold text-sky-700 hidden sm:inline">{me.name}</span>
              </div>
              <button onClick={handleLogout} className="text-xs text-sky-300 hover:text-sky-500 transition-colors font-medium hidden sm:inline">
                ログアウト
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 px-2 py-2 sm:px-5 sm:py-4 overflow-hidden">
        <div className="h-full bg-white rounded-xl sm:rounded-2xl shadow-sm border border-sky-100 p-2 sm:p-4 overflow-hidden">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="ja"
            firstDay={1}
            headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,dayGridWeek" }}
            buttonText={{ today: "今日", month: "月", week: "週" }}
            dayHeaderContent={(info) => info.date.toLocaleDateString("en-US", { weekday: "short" })}
            dayCellContent={(info) => info.dayNumberText.replace("日", "")}
            dayCellClassNames={(info) => {
              const d = info.date.getDay();
              if (d === 6) return ["!bg-blue-50"];
              if (d === 0) return ["!bg-rose-50"];
              return [];
            }}
            height="100%"
            events={events}
            selectable
            editable={!isMobile}
            longPressDelay={isMobile ? 500 : 0}
            select={openCreate}
            dateClick={openCreateFromDateClick}
            eventClick={openEdit}
            eventDrop={handleEventDrop}
            eventResize={(info: EventChangeArg) => handleEventDrop(info as unknown as EventDropArg)}
            eventContent={renderEventContent}
            dayMaxEvents={isMobile ? 2 : 3}
          />
        </div>
      </div>

      {/* モバイル用FAB（＋ボタン） */}
      <button
        onClick={() => {
          const today = new Date();
          const date = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
          resetForm();
          setFormDate(date); setFormEndDate(date);
          setFormStartTime("18:30");
          setFormEndTime("22:30");
          setModal({ mode: "create" });
        }}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-sky-500 to-teal-400 text-white rounded-full shadow-lg shadow-sky-200 flex items-center justify-center text-2xl font-bold z-40 active:scale-95 transition-transform"
      >
        ＋
      </button>

      {modal.mode !== "closed" && (
        <div
          className="fixed inset-0 bg-sky-950/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:px-4 sm:py-6"
          onClick={() => setModal({ mode: "closed" })}
        >
          <div
            className="bg-white w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-sky-500 to-teal-400 px-6 py-4 shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-base">
                  {modal.mode === "create" ? "✦ 予定を追加" : "✦ 予定を編集"}
                </h2>
                <button onClick={() => setModal({ mode: "closed" })} className="text-white/70 hover:text-white text-xl leading-none">×</button>
              </div>
              {modal.mode === "edit" && (
                <p className="text-sky-100 text-xs mt-0.5">
                  <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: modal.event.extendedProps.userColor }} />
                  {modal.event.extendedProps.userName}
                </p>
              )}
            </div>
            {formError && (
              <div className="bg-red-50 border-b border-red-100 px-6 py-2.5 shrink-0">
                <p className="text-red-500 text-sm font-medium">{formError}</p>
              </div>
            )}

            <div className="px-6 py-5 space-y-5 overflow-y-auto">
              {/* タイトル */}
              <div>
                <label className={`${labelCls} text-sky-500`}>タイトル</label>
                <input
                  type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  autoFocus={!isMobile} disabled={!canEdit} placeholder="予定のタイトル"
                  className={inputCls(!canEdit) + " placeholder-gray-300"}
                />
              </div>

              {/* 終日 / 調整中トグル */}
              <div className="flex items-center gap-5">
                <div
                  className={`flex items-center gap-2 ${canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                  onClick={() => canEdit && handleAllDayToggle(!formAllDay)}
                >
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${formAllDay ? "bg-sky-500" : "bg-gray-200"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${formAllDay ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-600 select-none">終日</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                  onClick={() => canEdit && setFormTentative((v) => !v)}
                >
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${formTentative ? "bg-amber-400" : "bg-gray-200"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${formTentative ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-600 select-none">調整中</span>
                </div>
              </div>

              {/* 予定の時間 */}
              <div>
                <label className={`${labelCls} text-sky-500`}>予定の時間</label>
                {formAllDay ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">開始日</p>
                      <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} disabled={!canEdit} className={inputCls(!canEdit)} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">終了日（空欄=未定）</p>
                      <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} disabled={!canEdit} className={inputCls(!canEdit)} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">日付</p>
                        <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} disabled={!canEdit} className={inputCls(!canEdit)} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">開始</p>
                        <TimePicker value={formStartTime} onChange={setFormStartTime} disabled={!canEdit} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">終了日</p>
                        <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} disabled={!canEdit} className={inputCls(!canEdit)} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">終了</p>
                        <TimePicker value={formEndTime} onChange={setFormEndTime} disabled={!canEdit} placeholder="未定" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 参加者 */}
              <div>
                <label className={`${labelCls} text-sky-500`}>参加者</label>
                <div className="flex gap-2">
                  {PARTICIPANTS.map((p) => {
                    const selected = formParticipants.includes(p.name);
                    return (
                      <button
                        key={p.name}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => {
                          if (!canEdit) return;
                          setFormParticipants((prev) =>
                            prev.includes(p.name) ? prev.filter((x) => x !== p.name) : [...prev, p.name]
                          );
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          selected ? "scale-105 shadow-sm" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                        }`}
                        style={selected ? { backgroundColor: p.color + "20", borderColor: p.color, color: p.color } : {}}
                      >
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white font-black leading-none"
                          style={{ backgroundColor: selected ? p.color : "#d1d5db", fontSize: "10px" }}
                        >
                          {p.name[0]}
                        </span>
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 場所 */}
              <div>
                <label className={`${labelCls} text-teal-500`}>場所</label>
                <input
                  type="text" value={formLocation} onChange={(e) => setFormLocation(e.target.value)}
                  disabled={!canEdit} placeholder="例：渋谷、自宅、会社..."
                  className={inputCls(!canEdit) + " placeholder-gray-300"}
                />
              </div>

              {/* タグ */}
              <div>
                <label className={`${labelCls} text-indigo-500`}>タグ</label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => {
                    const selected = formTagIds.includes(tag.id);
                    const c = tagColor(tag.id);
                    return (
                      <div key={tag.id} className="relative group">
                        <button
                          type="button"
                          onClick={() => canEdit && toggleTag(tag.id)}
                          disabled={!canEdit}
                          style={selected ? { backgroundColor: c.bg, color: c.text, borderColor: c.bg } : {}}
                          className={`pl-3 pr-6 py-1.5 rounded-full text-xs font-bold border-2 transition-all disabled:cursor-not-allowed ${
                            selected ? "shadow-sm scale-105" : "bg-white border-gray-100 text-gray-400 hover:border-gray-300"
                          }`}
                        >
                          {tag.name}
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTag(tag.id, e)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs leading-none opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                            title="削除"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {canEdit && (
                    addingTag ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text" value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddTag();
                            if (e.key === "Escape") { setAddingTag(false); setNewTagName(""); }
                          }}
                          placeholder="タグ名"
                          autoFocus
                          className="border-2 border-indigo-200 rounded-full px-3 py-1 text-xs w-24 focus:outline-none focus:border-indigo-400"
                        />
                        <button type="button" onClick={handleAddTag} className="text-xs text-indigo-500 font-bold hover:text-indigo-700">追加</button>
                        <button type="button" onClick={() => { setAddingTag(false); setNewTagName(""); }} className="text-xs text-gray-400 hover:text-gray-600">×</button>
                      </div>
                    ) : (
                      <button
                        type="button" onClick={() => setAddingTag(true)}
                        className="px-3 py-1.5 rounded-full text-xs font-bold border-2 border-dashed border-indigo-200 text-indigo-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                      >
                        ＋ 追加
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* 帰宅時間 */}
              <div>
                <label className={`${labelCls} text-orange-500`}>帰宅時間</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {LATE_LEVELS.map(({ level, label, icon, color }) => (
                    <button
                      key={level} type="button"
                      disabled={!canEdit}
                      onClick={() => canEdit && setFormLateLevel(level)}
                      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        formLateLevel === level
                          ? `${color} border-current scale-105 shadow-sm`
                          : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                      }`}
                    >
                      <span className="text-lg leading-none">{icon}</span>
                      <span className="leading-tight text-center">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 備考 */}
              <div>
                <label className={`${labelCls} text-gray-400`}>備考</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  disabled={!canEdit}
                  placeholder="メモ、持ち物、連絡事項など..."
                  rows={3}
                  className={`${inputCls(!canEdit)} resize-none placeholder-gray-300`}
                />
              </div>

            </div>

            <div className="px-4 pb-6 pt-3 flex gap-2 shrink-0 border-t border-gray-50">
              <button
                onClick={() => setModal({ mode: "closed" })}
                className="flex-1 border-2 border-gray-100 text-gray-500 rounded-xl py-3.5 text-sm font-semibold active:bg-gray-100 transition-colors"
              >
                キャンセル
              </button>
              {modal.mode === "edit" && (
                <button onClick={handleDelete} className="border-2 border-red-100 text-red-400 rounded-xl px-4 py-3.5 text-sm font-semibold active:bg-red-50 transition-colors">
                  削除
                </button>
              )}
              {canEdit && (
                <button onClick={handleSave} className="flex-1 bg-gradient-to-r from-sky-500 to-teal-400 text-white rounded-xl py-3.5 text-sm font-bold active:opacity-80 transition-opacity shadow-md shadow-sky-100">
                  保存
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
