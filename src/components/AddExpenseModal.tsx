"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type FundingSource = {
  id: string;
  name: string;
};

type Line = {
  funding_source_id: string;
  amount: string; // keep as string for input; convert on submit
};

type Props = {
  clubId: string;
  sources: FundingSource[];
};

export default function AddExpenseModal({ clubId, sources }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [vendor, setVendor] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");

  const [lines, setLines] = useState<Line[]>(() => [
    { funding_source_id: sources[0]?.id ?? "", amount: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => {
    return lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  }, [lines]);

  useEffect(() => {
    if (!open) {
      setVendor("");
      setOccurredOn("");
      setCategory("Other");
      setDescription("");
      setLines([{ funding_source_id: sources[0]?.id ?? "", amount: "" }]);
      setError(null);
      setLoading(false);
    }
  }, [open, sources]);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l))
    );
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { funding_source_id: sources[0]?.id ?? "", amount: "" },
    ]);
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleCreate() {
    setError(null);

    if (!vendor.trim()) return setError("Vendor is required.");
    if (!occurredOn) return setError("Date is required.");
    if (sources.length === 0) return setError("Add a funding source first.");

    // validate lines
    if (lines.length === 0) return setError("Add at least one funding line.");

    const normalized = lines.map((l) => ({
      funding_source_id: l.funding_source_id,
      amount: Number(l.amount),
    }));

    for (const l of normalized) {
      if (!l.funding_source_id) return setError("Pick funding for every line.");
      if (!Number.isFinite(l.amount) || l.amount <= 0)
        return setError("Every line amount must be > 0.");
    }

    // prevent duplicate sources in one expense (optional but recommended)
    const seen = new Set<string>();
    for (const l of normalized) {
      if (seen.has(l.funding_source_id))
        return setError("Do not repeat the same funding source twice.");
      seen.add(l.funding_source_id);
    }

    setLoading(true);

    try {
      const { error: rpcErr } = await supabase.rpc(
        "create_expense_with_lines_auto_year",
        {
          p_club_id: clubId,
          p_occurred_on: occurredOn,
          p_vendor: vendor,
          p_category: category,
          p_description: description,
          p_lines: normalized,
        }
      );

      if (rpcErr) throw new Error(rpcErr.message);

      setOpen(false);
      router.refresh();
      router.replace(window.location.pathname);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create expense.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
      >
        + Add Expense
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative w-full max-w-2xl rounded-2xl border bg-background p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Add Expense</div>
              <button
                onClick={() => !loading && setOpen(false)}
                className="text-sm text-muted-foreground"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">Vendor *</label>
                <input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Walmart"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm">Date *</label>
                <input
                  type="date"
                  value={occurredOn}
                  onChange={(e) => setOccurredOn(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option>Food</option>
                  <option>Supplies</option>
                  <option>Travel</option>
                  <option>Marketing</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Snacks for meeting"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">Funding lines</div>
                <button
                  type="button"
                  onClick={addLine}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  + Add line
                </button>
              </div>

              {lines.map((l, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                >
                  <div className="md:col-span-7 space-y-2">
                    <label className="text-sm">Funding source *</label>
                    <select
                      value={l.funding_source_id}
                      onChange={(e) =>
                        updateLine(i, { funding_source_id: e.target.value })
                      }
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      {sources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <label className="text-sm">Amount *</label>
                    <input
                      value={l.amount}
                      onChange={(e) =>
                        updateLine(i, { amount: e.target.value })
                      }
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="25.00"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      disabled={loading || lines.length === 1}
                      className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex justify-end text-sm text-muted-foreground">
                Total:{" "}
                <span className="ml-2 font-medium">${total.toFixed(2)}</span>
              </div>
            </div>

            {error && <div className="mt-4 text-sm text-red-500">{error}</div>}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => !loading && setOpen(false)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
              >
                {loading ? "Creating..." : "Create Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
