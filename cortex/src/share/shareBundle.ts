import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { buildBundle, serializeBundle, parseBundle, importBundle, ImportResult } from "./bundle";

function slug(s: string): string {
  return (
    (s || "mem")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "mem"
  );
}

/**
 * Write a meeting to a `.memit` file and open the iOS share sheet (AirDrop,
 * Messages, Files, …). Everything stays on-device / device-to-device.
 */
export async function exportMeeting(meetingId: string): Promise<void> {
  const bundle = buildBundle(meetingId, new Date().toISOString());
  const uri = `${FileSystem.cacheDirectory}${slug(bundle.meeting.title)}.memit`;
  await FileSystem.writeAsStringAsync(uri, serializeBundle(bundle));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/json",
    dialogTitle: "AirDrop this mem",
    UTI: "public.json",
  });
}

/**
 * Pick a received `.memit` file and merge it into the local brain. Returns the
 * import summary, or null if the user cancelled.
 */
export async function importMeetingFromFile(): Promise<ImportResult | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets || res.assets.length === 0) return null;

  const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
  const bundle = parseBundle(text);
  return importBundle(bundle);
}
