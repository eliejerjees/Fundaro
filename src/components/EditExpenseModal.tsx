"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Expense = {
  id: string;
  occurred_on: string;
  vendor: string;
  category: string;
  description: string | null;
};

export default function EditExpenseModal({
  expense,
}: {
  expense: Expense;
  clubId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [vendor, setVendor] = useState(expense.vendor);
  const [category, setCategory] = useState(expense.category);
  const [occurredOn, setOccurredOn] = useState(expense.occurred_on);
  const [description, setDescription] = useState(expense.description ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setError(null);
    if (!vendor.trim()) return setError("Vendor is required.");
    if (!category.trim()) return setError("Category is required.");
    if (!occurredOn) return setError("Date is required.");

    setLoading(true);

    const { error } = await supabase
      .from("expenses")
      .update({
        vendor,
        category,
        occurred_on: occurredOn,
        description: description.trim() ? description : null,
      })
      .eq("id", expense.id);

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
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border bg-background p-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Edit Expense</div>
              <button
                className="text-sm text-muted-foreground"
                onClick={() => !loading && setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4">
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

              <div className="space-y-2">
                <label className="text-sm">Description</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  onClick={onSave}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
