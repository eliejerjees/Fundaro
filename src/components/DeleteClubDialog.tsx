"use client";

import { ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { X } from "lucide-react";

type Club = { id: string; name: string; logo_url: string | null };

export default function DeleteClubDialog({
  club,
  trigger,
  canManage = true,
  onTrigger,
}: {
  club: Club;
  trigger: ReactNode;
  canManage?: boolean;
  onTrigger?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");

  if (!canManage) return null;

  async function onDelete() {
    setError(null);
    setLoading(true);
    try {
      // This requires DB cascade or a delete RPC. Start with direct delete:
      const { error } = await supabase.from("clubs").delete().eq("id", club.id);
      if (error) throw new Error(error.message);

      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Delete failed.");
    } finally {
      setLoading(false);
    }
  }

  const canDelete = confirm.trim().toLowerCase() === club.name.trim().toLowerCase();

  return (
    <>
      <span
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onTrigger?.();
          setOpen(true);
        }}
      >
        {trigger}
      </span>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => !loading && setOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-lg">
              <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4">
                <div>
                  <div className="text-base font-semibold text-zinc-900">Delete club</div>
                  <div className="mt-0.5 text-sm text-zinc-500">
                    This permanently deletes <span className="font-medium text-zinc-900">{club.name}</span>.
                  </div>
                </div>
                <button
                  onClick={() => !loading && setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="text-sm text-zinc-700">
                  Type the club name to confirm:
                </div>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder={club.name}
                />

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => !loading && setOpen(false)}
                  className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!canDelete || loading}
                  onClick={onDelete}
                  className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {loading ? "Deleting..." : "Delete club"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
