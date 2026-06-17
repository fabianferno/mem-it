import { useCallback, useEffect, useRef, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import type { PipelineResult } from "../types";

const INDEX = `${FileSystem.documentDirectory}gallery.json`;

export function useGallery() {
  const [items, setItems] = useState<PipelineResult[]>([]);
  const itemsRef = useRef<PipelineResult[]>([]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const load = useCallback(async () => {
    const info = await FileSystem.getInfoAsync(INDEX);
    if (!info.exists) { itemsRef.current = []; setItems([]); return; }
    const raw = await FileSystem.readAsStringAsync(INDEX);
    const parsed = JSON.parse(raw) as PipelineResult[];
    itemsRef.current = parsed;
    setItems(parsed);
  }, []);

  const add = useCallback(async (r: PipelineResult) => {
    const next = [r, ...itemsRef.current];
    itemsRef.current = next;
    setItems(next);
    await FileSystem.writeAsStringAsync(INDEX, JSON.stringify(next));
  }, []);

  useEffect(() => { load(); }, [load]);
  return { items, add, reload: load };
}
