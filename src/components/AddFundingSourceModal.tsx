"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function AddFundingSourceModal({
  clubId,
}: {
  clubId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    setError(null);
    if (!name.trim()) return setError("Name is required.");

    setLoading(true);
    const { error } = await supabase.from("funding_sources").insert({
      club_id: clubId,
      name,
      notes: notes.trim() ? notes : null,
    });

    setLoading(false);

    if (error) return setError(error.message);

    setOpen(false);
    setName("");
    setNotes("");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
      >
        + Add Source
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border bg-background p-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Add Funding Source</div>
              <button
                className="text-sm text-muted-foreground"
                onClick={() => !loading && setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm">Name *</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ATC / Sponsor / Donations"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm">Notes</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              {error && <div className="text-sm text-red-500">{error}</div>}

              <div className="flex justify-end gap-2">
                <button
                  className="rounded-md border px-3 py-2 text-sm"
                  onClick={() => !loading && setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
                  onClick={onCreate}
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
