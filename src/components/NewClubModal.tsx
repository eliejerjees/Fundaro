"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function NewClubModal() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) return setError("Club name is required.");

    setLoading(true);

    const { data, error } = await supabase.rpc("create_club", {
      p_name: trimmed,
      p_logo_url: logoUrl.trim() ? logoUrl.trim() : null,
    });

    setLoading(false);

    if (error) return setError(error.message);

    setOpen(false);
    setName("");
    setLogoUrl("");

    router.refresh();
    // optional: route straight into the club
    // if (data?.id) router.push(`/clubs/${data.id}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
      >
        + New Club
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border bg-background p-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Create Club</div>
              <button
                className="text-sm text-muted-foreground"
                onClick={() => !loading && setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm">Club name *</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="DISC"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm">Logo URL (optional)</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              {error && <div className="text-sm text-red-500">{error}</div>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm"
                  onClick={() => !loading && setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
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
