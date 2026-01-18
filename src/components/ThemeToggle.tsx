"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <select
      value={mode}
      onChange={(e) => setMode(e.target.value as any)}
      className="h-9 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 text-sm text-[rgb(var(--card-fg))]"
      aria-label="Theme"
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
