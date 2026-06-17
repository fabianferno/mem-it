import { useCallback, useEffect, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import type { PipelineResult } from "../types";

const INDEX = `${FileSystem.documentDirectory}gallery.json`;

export function useGallery() {
  const [items, setItems] = useState<PipelineResult[]>([]);

  const load = useCallback(async () => {
    const info = await FileSystem.getInfoAsync(INDEX);
    if (!info.exists) { setItems([]); return; }
    const raw = await FileSystem.readAsStringAsync(INDEX);
    setItems(JSON.parse(raw) as PipelineResult[]);
  }, []);

  const add = useCallback(async (r: PipelineResult) => {
    const next = [r, ...items];
    setItems(next);
    await FileSystem.writeAsStringAsync(INDEX, JSON.stringify(next));
  }, [items]);

  useEffect(() => { load(); }, [load]);
  return { items, add, reload: load };
}
