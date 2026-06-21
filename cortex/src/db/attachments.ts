import type { MeetingAttachment, AttachmentStatus } from "../types";
import { openDb, newId } from "./sqlite";

type AttachmentRow = {
  id: string;
  meeting_id: string;
  uri: string;
  analysis: string | null;
  status: AttachmentStatus;
  created_at: number;
};

function toAttachment(r: AttachmentRow): MeetingAttachment {
  return {
    id: r.id,
    meetingId: r.meeting_id,
    uri: r.uri,
    analysis: r.analysis,
    status: r.status,
    createdAt: r.created_at,
  };
}

export function addAttachment(meetingId: string, uri: string): MeetingAttachment {
  const a: MeetingAttachment = {
    id: newId(),
    meetingId,
    uri,
    analysis: null,
    status: "analyzing",
    createdAt: Date.now(),
  };
  openDb().runSync(
    `INSERT INTO meeting_attachments (id, meeting_id, uri, analysis, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [a.id, a.meetingId, a.uri, a.analysis, a.status, a.createdAt]
  );
  return a;
}

export function getAttachments(meetingId: string): MeetingAttachment[] {
  const rows = openDb().getAllSync(
    `SELECT * FROM meeting_attachments WHERE meeting_id = ? ORDER BY created_at ASC, rowid ASC`,
    [meetingId]
  ) as AttachmentRow[];
  return rows.map(toAttachment);
}

export function updateAttachmentAnalysis(
  id: string,
  analysis: string | null,
  status: AttachmentStatus
): void {
  openDb().runSync(`UPDATE meeting_attachments SET analysis = ?, status = ? WHERE id = ?`, [
    analysis,
    status,
    id,
  ]);
}

export function deleteAttachment(id: string): void {
  openDb().runSync(`DELETE FROM meeting_attachments WHERE id = ?`, [id]);
}
