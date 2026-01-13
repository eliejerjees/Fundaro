"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Source = { id: string; name: string; remaining: number };

type FundingLine = {
  id?: string; // existing line id (optional for new rows)
  funding_source_id: string;
  amount: number;
};

type Expense = {
  id: string;
  occurred_on: string;
  vendor: string;
  category: string;
  description: string | null;
  expense_funding_lines?: FundingLine[];
};

export default function EditExpenseModal({
  expense,
  sources,
}: {
  expense: Expense;
  clubId: string;
  sources: Source[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [open, setOpen] = useState(false);

  // core expense fields
  const [vendor, setVendor] = useState(expense.vendor);
  const [category, setCategory] = useState(expense.category);
  const [occurredOn, setOccurredOn] = useState(expense.occurred_on);
  const [description, setDescription] = useState(expense.description ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // funding split editing
  const initialLines: FundingLine[] =
    expense.expense_funding_lines && expense.expense_funding_lines.length > 0
      ? expense.expense_funding_lines.map((l) => ({
          id: l.id,
          funding_source_id: l.funding_source_id,
          amount: Number(l.amount),
        }))
      : sources.length > 0
      ? [{ funding_source_id: sources[0].id, amount: 0 }]
      : [];

  const [lines, setLines] = useState<FundingLine[]>(initialLines);
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);

  // delete confirm
  const [confirmText, setConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function isBusy() {
    return loading || splitLoading || deleteLoading;
  }

  function setLine(idx: number, patch: Partial<FundingLine>) {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l))
    );
  }

  function addLine() {
    if (sources.length === 0) return;
    setLines((prev) => [...prev, { funding_source_id: sources[0].id, amount: 0 }]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalSplit = lines.reduce((sum, l) => sum + Number(l.amount || 0), 0);

  async function onSave() {
    setError(null);
    if (!vendor.trim()) return setError("Vendor is required.");
    if (!category.trim()) return setError("Category is required.");
    if (!occurredOn) return setError("Date is required.");

    setLoading(true);

    const { error } = await supabase
      .from("expenses")
      .update({
        vendor: vendor.trim(),
        category: category.trim(),
        occurred_on: occurredOn,
        description: description.trim() ? description.trim() : null,
      })
      .eq("id", expense.id);

    setLoading(false);

    if (error) return setError(error.message);

    router.refresh();
  }

  async function onSaveSplit() {
    setSplitError(null);

    if (lines.length === 0) return setSplitError("Add at least one funding line.");

    for (const l of lines) {
      if (!l.funding_source_id) return setSplitError("Every line needs a source.");
      const n = Number(l.amount);
      if (!Number.isFinite(n) || n < 0) return setSplitError("Amounts must be >= 0.");
    }

    setSplitLoading(true);

    // 1) delete existing lines for this expense
    const delRes = await supabase
      .from("expense_funding_lines")
      .delete({ count: "exact" })
      .eq("expense_id", expense.id)
      .select("id");

    if (delRes.error) {
      setSplitLoading(false);
      return setSplitError(delRes.error.message);
    }

    // 2) insert new lines
    // We include club_id/club_year_id by fetching them from the expense row to avoid missing columns.
    // If your expense_funding_lines table requires club_id and club_year_id, we need them here.
    const { data: expRow, error: expErr } = await supabase
      .from("expenses")
      .select("club_id, club_year_id")
      .eq("id", expense.id)
      .single();

    if (expErr) {
      setSplitLoading(false);
      return setSplitError(expErr.message);
    }

    const payload = lines.map((l) => ({
      expense_id: expense.id,
      club_id: expRow.club_id,
      club_year_id: expRow.club_year_id,
      funding_source_id: l.funding_source_id,
      amount: Number(l.amount),
    }));

    const insRes = await supabase
      .from("expense_funding_lines")
      .insert(payload)
      .select("id");

    if (insRes.error) {
      setSplitLoading(false);
      // This is where your budget trigger will throw “Budget exceeded…”
      return setSplitError(insRes.error.message);
    }

    setSplitLoading(false);
    router.refresh();
  }

  async function onDelete() {
    setDeleteError(null);

    if (confirmText.trim().toLowerCase() !== "delete") {
      return setDeleteError('Type "delete" to confirm.');
    }

    setDeleteLoading(true);

    // delete lines first
    const linesRes = await supabase
      .from("expense_funding_lines")
      .delete({ count: "exact" })
      .eq("expense_id", expense.id)
      .select("id");

    if (linesRes.error) {
      setDeleteLoading(false);
      return setDeleteError(linesRes.error.message);
    }

    const expRes = await supabase
      .from("expenses")
      .delete({ count: "exact" })
      .eq("id", expense.id)
      .select("id");

    if (expRes.error) {
      setDeleteLoading(false);
      return setDeleteError(expRes.error.message);
    }
    if ((expRes.count ?? 0) === 0) {
      setDeleteLoading(false);
      return setDeleteError("Deleted 0 rows (RLS or bad id).");
    }

    setDeleteLoading(false);
    setOpen(false);

    router.refresh();
    window.location.reload();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border px-3 py-1.5 text-sm"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !isBusy() && setOpen(false)}
          />
          <div className="relative w-full max-w-2xl rounded-2xl border bg-background p-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Edit Expense</div>
              <button
                type="button"
                className="text-sm text-muted-foreground"
                onClick={() => !isBusy() && setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-6">
              {/* Core fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm">Date</label>
                  <input
                    type="date"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={occurredOn}
                    onChange={(e) => setOccurredOn(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm">Vendor</label>
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm">Category</label>
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm">Description</label>
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              {error && <div className="text-sm text-red-500">{error}</div>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm"
                  onClick={() => !isBusy() && setOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isBusy()}
                  className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
                  onClick={onSave}
                >
                  {loading ? "Saving..." : "Save Fields"}
                </button>
              </div>

              {/* Funding split */}
              <div className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">Funding Split</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Update which funding source(s) paid for this expense.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addLine}
                    disabled={isBusy() || sources.length === 0}
                    className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
                  >
                    + Add line
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {lines.map((l, idx) => (
                    <div
                      key={l.id ?? `${idx}-${l.funding_source_id}`}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                    >
                      <div className="md:col-span-7">
                        <select
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value={l.funding_source_id}
                          onChange={(e) =>
                            setLine(idx, { funding_source_id: e.target.value })
                          }
                          disabled={isBusy()}
                        >
                          {sources.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} (Remaining: ${s.remaining.toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <input
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value={String(l.amount)}
                          onChange={(e) =>
                            setLine(idx, { amount: Number(e.target.value) })
                          }
                          disabled={isBusy()}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="md:col-span-2 flex justify-end">
                        <button
                          type="button"
                          className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
                          onClick={() => removeLine(idx)}
                          disabled={isBusy() || lines.length <= 1}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Total split: <span className="font-medium">${totalSplit.toFixed(2)}</span>
                  </div>

                  <button
                    type="button"
                    disabled={isBusy()}
                    className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
                    onClick={onSaveSplit}
                  >
                    {splitLoading ? "Saving..." : "Save Split"}
                  </button>
                </div>

                {splitError && (
                  <div className="mt-2 text-sm text-red-500">{splitError}</div>
                )}
              </div>

              {/* Danger zone */}
              <div className="rounded-xl border border-red-500/40 p-4">
                <div className="text-sm font-semibold text-red-500">Danger zone</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  This permanently deletes the expense and its funding lines.
                </div>

                <div className="mt-3 space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Type <span className="font-medium">delete</span> to confirm
                  </label>
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="delete"
                    disabled={isBusy()}
                  />
                </div>

                {deleteError && (
                  <div className="mt-2 text-sm text-red-500">{deleteError}</div>
                )}

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={isBusy()}
                    onClick={onDelete}
                    className="rounded-md bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    {deleteLoading ? "Deleting..." : "Delete Expense"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
