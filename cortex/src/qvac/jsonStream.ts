/**
 * Incremental parser for a top-level JSON array that arrives in chunks (an LLM
 * token stream). Emits each complete top-level object via `onItem` the moment
 * its closing brace arrives, so the graph can grow optimistically before the
 * model finishes. Tolerates leading prose / ```json fences before the array.
 */
export function createArrayItemParser<T>(onItem: (item: T) => void) {
  let buf = "";
  let cursor = 0; // scan position within buf
  let started = false; // have we seen the opening '['
  let depth = 0; // object-brace depth
  let objStart = -1; // index where the current top-level object began
  let inString = false;
  let escape = false;
  const items: T[] = [];

  function scan() {
    for (; cursor < buf.length; cursor++) {
      const ch = buf[cursor];

      if (!started) {
        if (ch === "[") started = true;
        continue;
      }

      if (inString) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') inString = false;
        continue;
      }

      if (ch === '"') {
        inString = true;
      } else if (ch === "{") {
        if (depth === 0) objStart = cursor;
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0 && objStart !== -1) {
          const slice = buf.slice(objStart, cursor + 1);
          objStart = -1;
          try {
            const item = JSON.parse(slice) as T;
            items.push(item);
            onItem(item);
          } catch {
            // incomplete/garbled object — skip it, keep streaming
          }
        }
      }
      // ']' , whitespace, commas at depth 0 need no handling
    }
  }

  return {
    push(chunk: string) {
      buf += chunk;
      scan();
    },
    end(): T[] {
      scan();
      return items;
    },
  };
}
