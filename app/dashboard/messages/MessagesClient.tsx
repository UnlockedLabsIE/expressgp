"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Message } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ThreadPatient = {
  id: string;
  first_name: string;
  last_name: string;
};

// GDPR data minimisation: thread list carries metadata only — no message body.
// Full message bodies are fetched on demand when a thread is opened.
type ThreadMessage = Pick<Message, "id" | "sender_type" | "is_read" | "created_at">;

type Thread = {
  id: string;                  // consultation id
  service_type: string;
  service_subtype: string | null;
  status: string;
  created_at: string;
  patient: ThreadPatient;
  messages: ThreadMessage[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relTime(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-IE", { day: "2-digit", month: "short" });
}

function initials(p: ThreadPatient) {
  return `${p.first_name[0] ?? ""}${p.last_name[0] ?? ""}`.toUpperCase();
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });
}

const SVC_LABEL: Record<string, string> = {
  prescription:     "Prescription",
  sick_note:        "Sick Note",
  referral:         "Referral",
  medical_cert:     "Medical Cert",
  gp_consultation:  "GP Consultation",
  glp1:             "GLP-1",
  insurance_report: "Insurance Report",
  corporate:        "Corporate",
  fit_to_fly:       "Fit to Fly",
  fit_to_work:      "Fit to Work",
};

const STATUS_BADGE: Record<string, string> = {
  pending:            "bg-amber-500/15 text-amber-300",
  under_review:       "bg-blue-500/15 text-blue-300",
  approved:           "bg-green-500/15 text-green-300",
  declined:           "bg-red-500/15 text-red-300",
  more_info_required: "bg-amber-500/15 text-amber-300",
  cancelled:          "bg-slate-500/15 text-slate-300",
};

// ─── Thread list item ─────────────────────────────────────────────────────────

function ThreadRow({
  thread, selected, onClick,
}: { thread: Thread; selected: boolean; onClick: () => void }) {
  const lastMsg   = [...thread.messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const unread    = thread.messages.filter(m => m.sender_type === "patient" && !m.is_read).length;
  const patName   = `${thread.patient.first_name} ${thread.patient.last_name}`;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-white/5 transition-colors ${
        selected ? "bg-white/8 border-l-2 border-l-blue-400" : "hover:bg-white/4"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          unread > 0 ? "bg-blue-500/25 text-blue-200" : "bg-white/8 text-white/50"
        }`}>
          {initials(thread.patient)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`text-sm font-semibold truncate ${unread > 0 ? "text-white" : "text-white/70"}`}>
              {patName}
            </span>
            <span className="shrink-0 text-[10px] text-white/30">
              {lastMsg ? relTime(lastMsg.created_at) : relTime(thread.created_at)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-white/35 truncate">
              {SVC_LABEL[thread.service_type] ?? thread.service_type}
            </span>
          </div>

          {unread > 0 && (
            <p className="mt-1 text-xs font-medium text-blue-300">
              {unread === 1 ? "New message" : `${unread} new messages`}
            </p>
          )}
        </div>

        {unread > 0 && (
          <span className="mt-1 shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: Message }) {
  const isGP = msg.sender_type === "partner_doctor";
  return (
    <div className={`flex ${isGP ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
        isGP
          ? "bg-blue-600/30 text-blue-50 rounded-br-md"
          : "bg-white/8 text-white/85 rounded-bl-md"
      }`}>
        <p className="text-sm leading-relaxed">{msg.body}</p>
        <p className={`mt-1 text-[10px] ${isGP ? "text-blue-300/50" : "text-white/25"} text-right`}>
          {fmtTime(msg.created_at)}
        </p>
      </div>
    </div>
  );
}

// ─── Date separator ───────────────────────────────────────────────────────────

function DateSep({ iso }: { iso: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 border-t border-white/8" />
      <span className="text-[10px] text-white/25 shrink-0">{fmtDay(iso)}</span>
      <div className="flex-1 border-t border-white/8" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MessagesClient({ isAcceptingCases = true }: { isAcceptingCases?: boolean }) {
  const supabase = createClient();

  const [threads, setThreads]       = useState<Thread[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState("");
  const [search, setSearch]         = useState("");
  const msgEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch all assigned consultations with messages ───────────────────────

  async function fetchThreads() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // GDPR Art.5(1)(c) — data minimisation. List view pulls metadata only;
    // message bodies are fetched in the effect below once a thread is opened.
    const { data, error } = await supabase
      .from("consultations")
      .select(`
        id, service_type, service_subtype, status, created_at,
        patient:patients ( id, first_name, last_name ),
        messages ( id, sender_type, is_read, created_at )
      `)
      .eq("partner_doctor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) { console.error(error); setLoading(false); return; }

    type Row = {
      id: string;
      service_type: string;
      service_subtype: string | null;
      status: string;
      created_at: string;
      patient: ThreadPatient | ThreadPatient[];
      messages: ThreadMessage[] | null;
    };
    const normalized: Thread[] = (data ?? []).map((row: Row) => ({
      id: row.id,
      service_type: row.service_type,
      service_subtype: row.service_subtype,
      status: row.status,
      created_at: row.created_at,
      patient: Array.isArray(row.patient) ? row.patient[0]! : row.patient,
      messages: Array.isArray(row.messages) ? row.messages : [],
    }));

    // Only show threads that have at least one message
    const withMsgs = normalized.filter(t => t.messages.length > 0);

    // Sort by latest message timestamp desc
    withMsgs.sort((a, b) => {
      const aLast = Math.max(...a.messages.map(m => new Date(m.created_at).getTime()));
      const bLast = Math.max(...b.messages.map(m => new Date(m.created_at).getTime()));
      return bLast - aLast;
    });

    setThreads(withMsgs);
    setLoading(false);
  }

  useEffect(() => { fetchThreads(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── When a thread is selected, load its messages + mark read ────────────

  useEffect(() => {
    if (!selectedId) return;

    let cancelled = false;

    // TODO(audit): opening a thread is a material clinical-data view event
    // (ISO 27001 / GDPR Art.32). Insert an `audit_logs` row here with
    // action = "clinical_messages_viewed", table_name = "consultations",
    // record_id = selectedId. Mirrors the pattern in
    // app/dashboard/consultations/[id]/page.tsx's "clinical_data_viewed" log.

    // Fetch full message bodies for this thread only — not preloaded for the list.
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("consultation_id", selectedId)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (error) { console.error(error); return; }
      setMessages((data ?? []) as Message[]);
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "instant" }), 50);
    })();

    // Mark all patient messages as read (optimistic update on the list metadata)
    supabase.from("messages")
      .update({ is_read: true })
      .eq("consultation_id", selectedId)
      .eq("sender_type", "patient")
      .eq("is_read", false)
      .then(() => {
        if (cancelled) return;
        setThreads(prev => prev.map(t =>
          t.id === selectedId
            ? { ...t, messages: t.messages.map(m => m.sender_type === "patient" ? { ...m, is_read: true } : m) }
            : t
        ));
      });

    return () => { cancelled = true; };
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time subscription ───────────────────────────────────────────────

  useEffect(() => {
    const ch = supabase.channel("messages-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          // Thread list gets metadata only — never store body in the list state.
          const meta: ThreadMessage = {
            id: msg.id,
            sender_type: msg.sender_type,
            is_read: msg.is_read,
            created_at: msg.created_at,
          };
          setThreads(prev => prev.map(t =>
            t.id === msg.consultation_id
              ? { ...t, messages: [...t.messages, meta] }
              : t
          ));
          // If this thread is open, the detail pane keeps the full message.
          if (msg.consultation_id === selectedId) {
            setMessages(prev => [...prev, msg]);
            setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send message ─────────────────────────────────────────────────────────

  async function send() {
    const body = input.trim();
    if (!body || !selectedId) return;
    setInput("");
    await supabase.from("messages").insert({
      consultation_id: selectedId,
      sender_type: "partner_doctor",
      body,
      is_read: false,
    });
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return threads;
    const q = search.toLowerCase();
    return threads.filter(t =>
      `${t.patient.first_name} ${t.patient.last_name}`.toLowerCase().includes(q) ||
      (SVC_LABEL[t.service_type] ?? t.service_type).toLowerCase().includes(q)
    );
  }, [threads, search]);

  const selected = threads.find(t => t.id === selectedId) ?? null;
  const totalUnread = threads.reduce((n, t) =>
    n + t.messages.filter(m => m.sender_type === "patient" && !m.is_read).length, 0);

  // ── Group messages by day ────────────────────────────────────────────────

  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: Message[] }[] = [];
    for (const msg of messages) {
      const day = msg.created_at.slice(0, 10);
      const last = groups[groups.length - 1];
      if (last?.date === day) { last.msgs.push(msg); }
      else { groups.push({ date: day, msgs: [msg] }); }
    }
    return groups;
  }, [messages]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col overflow-hidden bg-[#0f1729]">
      {!isAcceptingCases && (
        <div className="shrink-0 border-b border-amber-500/25 bg-amber-500/10 px-4 py-2">
          <p className="text-[11px] text-amber-100/90">
            Offline for new cases — patients are told next working day response.{" "}
            <Link href="/dashboard/settings" className="font-medium underline underline-offset-2 hover:text-white">
              Settings
            </Link>
          </p>
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">

      {/* ── Thread list ─────────────────────────────────────────────────── */}
      <div className="flex w-72 shrink-0 flex-col border-r border-white/8">
        {/* Header */}
        <div className="border-b border-white/8 px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-white">Messages</h1>
            {totalUnread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">
                {totalUnread}
              </span>
            )}
          </div>
          {/* Search */}
          <div className="mt-3 relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search patients…"
              className="w-full rounded-xl bg-white/5 pl-8 pr-3 py-2 text-xs text-white placeholder:text-white/25 outline-none ring-1 ring-white/8 focus:ring-white/20 transition-all"
            />
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="space-y-1 p-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-16 rounded-xl bg-white/4 animate-pulse" />
              ))}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <p className="text-sm text-white/30">No conversations yet</p>
              <p className="text-xs text-white/20 mt-1">Messages appear here once a case is claimed</p>
            </div>
          )}
          {filtered.map(thread => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              selected={selectedId === thread.id}
              onClick={() => setSelectedId(thread.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Thread / message pane ────────────────────────────────────────── */}
      {!selected ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
              <svg className="h-7 w-7 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-white/40">Select a conversation</p>
            <p className="mt-1 text-xs text-white/20">Choose a thread from the left to view messages</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Thread header */}
          <div className="flex items-center justify-between border-b border-white/8 px-6 py-4 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-white truncate">
                  {selected.patient.first_name} {selected.patient.last_name}
                </h2>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[selected.status] ?? "bg-white/8 text-white/40"}`}>
                  {selected.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-white/35">
                {SVC_LABEL[selected.service_type] ?? selected.service_type}
                {" · "}
                <span className="font-mono">{selected.id.slice(0, 8).toUpperCase()}</span>
              </p>
            </div>
            <Link
              href={`/dashboard/consultations/${selected.id}`}
              className="shrink-0 rounded-xl bg-white/5 px-3 py-2 text-xs font-medium text-white/50 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white"
            >
              Open case →
            </Link>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-white/25">No messages in this conversation yet.</p>
              </div>
            )}
            {groupedMessages.map(group => (
              <div key={group.date}>
                <DateSep iso={group.date + "T00:00:00"} />
                <div className="space-y-2">
                  {group.msgs.map(msg => <Bubble key={msg.id} msg={msg} />)}
                </div>
              </div>
            ))}
            <div ref={msgEndRef} />
          </div>

          {/* Send box */}
          <div className="shrink-0 border-t border-white/8 px-6 py-4">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={`Message ${selected.patient.first_name}…`}
                className="flex-1 rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none ring-1 ring-white/8 focus:ring-white/20 transition-all"
              />
              <button
                onClick={send}
                disabled={!input.trim()}
                className="rounded-xl bg-blue-600/20 px-4 py-2.5 text-sm font-semibold text-blue-200 ring-1 ring-blue-500/30 transition-all hover:bg-blue-600/30 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
