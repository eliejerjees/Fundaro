"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function SetAllocationModal({
  clubId,
  clubYearId,
  fundingSourceId,
  fundingSourceName,
  currentAllocated,
}: {
  clubId: string;
  clubYearId: string;
  fundingSourceId: string;
  fundingSourceName: string;
  currentAllocated: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(currentAllocated.toFixed(2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setError(null);

    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) return setError("Amount must be >= 0.");

    setLoading(true);

    const { error } = await supabase.from("funding_allocations").upsert(
      {
        club_id: clubId,
        club_year_id: clubYearId,
        term: "year",
        funding_source_id: fundingSourceId,
        amount: n,
      },
      { onConflict: "club_year_id,funding_source_id,term" }
    );

    setLoading(false);

    if (error) return setError(error.message);

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border px-3 py-1.5 text-sm"
      >
        Set
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border bg-background p-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Set Allocation</div>
              <button
                className="text-sm text-muted-foreground"
                onClick={() => !loading && setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="text-muted-foreground">Source</div>
              <div className="font-medium">{fundingSourceName}</div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm">Allocated (Year)</label>
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              <div className="text-xs text-muted-foreground">
                This overwrites the allocation for the selected year.
              </div>
            </div>

            {error && <div className="mt-3 text-sm text-red-500">{error}</div>}

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-md border px-3 py-2 text-sm"
                onClick={() => !loading && setOpen(false)}
              >
                Cancel
              </button>
              <button
                disabled={loading}
                className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
                onClick={onSave}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
