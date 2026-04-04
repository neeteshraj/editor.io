import { useState, useCallback } from "react";

export function useLocalStorage(key: string, initialValue: string): [string, (value: string) => void] {
  const [storedValue, setStoredValue] = useState<string>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      const parsed = JSON.parse(raw);
      // Treat empty string as "no saved value" — use the default instead
      if (typeof parsed === "string" && parsed.trim() === "") return initialValue;
      return parsed;
    } catch {
      // If JSON.parse fails, the value might be stored as raw string (old format)
      try {
        const raw = window.localStorage.getItem(key);
        if (raw && raw.trim() !== "" && raw !== '""') return raw;
      } catch {}
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: string) => {
      setStoredValue(value);
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // ignore
      }
    },
    [key]
  );

  return [storedValue, setValue];
}
