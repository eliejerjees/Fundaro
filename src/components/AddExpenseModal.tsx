"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

type FundingSource = {
  id: string;
  name: string;
};

type Props = {
  clubId: string;
  clubYearId: string;
  sources: FundingSource[];
};

export default function AddExpenseModal({
  clubId,
  clubYearId,
  sources,
}: Props) {
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const [open, setOpen] = useState(false);

  const [vendor, setVendor] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");

  const [fundingSourceId, setFundingSourceId] = useState(sources[0]?.id ?? "");
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setVendor("");
      setOccurredOn("");
      setCategory("Other");
      setDescription("");
      setFundingSourceId(sources[0]?.id ?? "");
      setAmount("");
      setError(null);
      setLoading(false);
    }
  }, [open, sources]);

  async function handleCreate() {
    setError(null);

    if (!vendor.trim()) return setError("Vendor is required.");
    if (!occurredOn) return setError("Date is required.");
    if (!fundingSourceId) return setError("Pick a funding source.");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0)
      return setError("Amount must be > 0.");

    setLoading(true);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) throw new Error("Not logged in.");

      // 1) create expense
      const { data: expense, error: expErr } = await supabase
        .from("expenses")
        .insert({
          club_id: clubId,
          club_year_id: clubYearId,
          occurred_on: occurredOn,
          vendor,
          description: description || null,
          category,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (expErr) throw new Error(expErr.message);

      // 2) create funding line
      const { error: lineErr } = await supabase
        .from("expense_funding_lines")
        .insert({
          expense_id: expense.id,
          club_id: clubId,
          club_year_id: clubYearId,
          funding_source_id: fundingSourceId,
          amount: amt,
        });

      if (lineErr) throw new Error(lineErr.message);

      setOpen(false);
      router.refresh();
      router.replace(window.location.pathname);
    } catch (e: any) {
      setError(e.message ?? "Failed to create expense.");
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
          <div className="relative w-full max-w-xl rounded-2xl border bg-background p-6 shadow-lg">
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

              <div className="space-y-2">
                <label className="text-sm">Funding source *</label>
                <select
                  value={fundingSourceId}
                  onChange={(e) => setFundingSourceId(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm">Amount *</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="45.50"
                />
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
