import type { Meeting, ActionItem } from "../types";
import { openDb, newId } from "./sqlite";

type MeetingRow = {
  id: string;
  title: string;
  started_at: number;
  ended_at: number | null;
  audio_uri: string | null;
  transcript: string | null;
  summary: string | null;
  status: Meeting["status"];
};

function toMeeting(r: MeetingRow): Meeting {
  return {
    id: r.id,
    title: r.title,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    audioUri: r.audio_uri,
    transcript: r.transcript,
    summary: r.summary,
    status: r.status,
  };
}

export function createMeeting(p: { title: string; audioUri?: string | null }): Meeting {
  const m: Meeting = {
    id: newId(),
    title: p.title,
    startedAt: Date.now(),
    endedAt: null,
    audioUri: p.audioUri ?? null,
    transcript: null,
    summary: null,
    status: "recording",
  };
  openDb().runSync(
    `INSERT INTO meetings (id, title, started_at, ended_at, audio_uri, transcript, summary, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [m.id, m.title, m.startedAt, m.endedAt, m.audioUri, m.transcript, m.summary, m.status]
  );
  return m;
}

const PATCH_COLS: Record<keyof Meeting, string> = {
  id: "id",
  title: "title",
  startedAt: "started_at",
  endedAt: "ended_at",
  audioUri: "audio_uri",
  transcript: "transcript",
  summary: "summary",
  status: "status",
};

export function updateMeeting(id: string, patch: Partial<Meeting>): void {
  const keys = Object.keys(patch).filter((k) => k !== "id") as (keyof Meeting)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${PATCH_COLS[k]} = ?`).join(", ");
  const values = keys.map((k) => patch[k] as unknown);
  openDb().runSync(`UPDATE meetings SET ${setClause} WHERE id = ?`, [...values, id]);
}

export function getMeeting(id: string): Meeting | null {
  const row = openDb().getFirstSync(`SELECT * FROM meetings WHERE id = ?`, [id]) as MeetingRow | null;
  return row ? toMeeting(row) : null;
}

export function listMeetings(): Meeting[] {
  const rows = openDb().getAllSync(
    `SELECT * FROM meetings ORDER BY started_at DESC`
  ) as MeetingRow[];
  return rows.map(toMeeting);
}

export function addActionItem(meetingId: string, text: string): ActionItem {
  const item: ActionItem = { id: newId(), meetingId, text, done: false };
  openDb().runSync(
    `INSERT INTO action_items (id, meeting_id, text, done) VALUES (?, ?, ?, ?)`,
    [item.id, item.meetingId, item.text, 0]
  );
  return item;
}

export function getActionItems(meetingId: string): ActionItem[] {
  const rows = openDb().getAllSync(`SELECT * FROM action_items WHERE meeting_id = ?`, [
    meetingId,
  ]) as { id: string; meeting_id: string; text: string; done: number }[];
  return rows.map((r) => ({ id: r.id, meetingId: r.meeting_id, text: r.text, done: !!r.done }));
}

export function toggleActionItem(id: string, done: boolean): void {
  openDb().runSync(`UPDATE action_items SET done = ? WHERE id = ?`, [done ? 1 : 0, id]);
}
