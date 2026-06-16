import * as FileSystem from "expo-file-system/legacy"; // v56: legacy subpath exposes documentDirectory + read/writeAsStringAsync

function base64ToBytes(b64: string): Uint8Array {
  const binary = global.atob ? global.atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function readPhotoBytes(uri: string): Promise<Uint8Array> {
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return base64ToBytes(b64);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return global.btoa ? global.btoa(binary) : Buffer.from(binary, "binary").toString("base64");
}

export async function writeStylizedPng(bytes: Uint8Array, id: string): Promise<string> {
  const uri = `${FileSystem.documentDirectory}stylized-${id}.png`;
  await FileSystem.writeAsStringAsync(uri, bytesToBase64(bytes), { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}
