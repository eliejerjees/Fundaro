"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { X, Upload, Plus, Trash2 } from "lucide-react";

type FundingDraft = {
  name: string;
  allocation: string; // string input -> parse float
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function NewClubModal() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [fundingSources, setFundingSources] = useState<FundingDraft[]>([
    { name: "ATC", allocation: "" },
    { name: "Membership Dues", allocation: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setLogoFile(null);
    setLogoPreview(null);
    setFundingSources([
      { name: "ATC", allocation: "" },
      { name: "Membership Dues", allocation: "" },
    ]);
    setError(null);
  }

  function onPickFile(file: File | null) {
    setLogoFile(file);
    if (!file) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  }

  function addFundingSource() {
    setFundingSources((prev) => [...prev, { name: "", allocation: "" }]);
  }

  function removeFundingSource(idx: number) {
    setFundingSources((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateFundingSource(idx: number, patch: Partial<FundingDraft>) {
    setFundingSources((prev) =>
      prev.map((x, i) => (i === idx ? { ...x, ...patch } : x))
    );
  }

  async function uploadLogo(
    clubId: string
  ): Promise<{ publicUrl: string; path: string } | null> {
    if (!logoFile) return null;

    // bucket name: CHANGE THIS if yours differs
    const bucket = "club-logos";

    const ext = logoFile.name.split(".").pop() || "png";
    const safe = slugify(name || "club");
    const path = `${clubId}/${safe}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, logoFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: logoFile.type,
      });

    if (uploadError) throw new Error(`Logo upload failed: ${uploadError.message}`);

    // Public URL (if bucket is public)
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data.publicUrl;

    return { publicUrl, path };
  }

  async function createFundingSources(clubId: string) {
    const cleaned = fundingSources
      .map((s) => ({
        name: s.name.trim(),
      }))
      .filter((s) => s.name.length > 0);

    if (cleaned.length === 0) return;

    const rows = cleaned.map((s) => ({
      club_id: clubId,
      name: s.name,
    }));

    // table name: CHANGE THIS if yours differs
    const { error } = await supabase.from("funding_sources").insert(rows);
    if (error) throw new Error(error.message);
  }

  async function onCreate() {
    setError(null);

    const { data: u, error: ue } = await supabase.auth.getUser();
    if (ue) {
      setError(ue.message);
      return;
    }
    if (!u.user) {
      setError("Browser session missing. Refresh the page and sign in again.");
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) return setError("Club name is required.");

    for (const s of fundingSources) {
      if (s.name.trim().length === 0) continue;
    }

    setLoading(true);

    try {
      // 1) Create club
      const { data, error: rpcError } = await supabase.rpc("create_club", {
        p_name: trimmed,
        p_logo_url: null, // we upload after
      });

      if (rpcError) throw new Error(rpcError.message);

      // data might be club row or { id }
      const clubId: string | undefined =
        (data?.id as string | undefined) ??
        (Array.isArray(data) ? data?.[0]?.id : undefined);

      if (!clubId) throw new Error("Club created but no club id returned from create_club.");

      // 2) Upload logo (optional)
      const logo = await uploadLogo(clubId);

      // 3) Update club with uploaded logo url (if available)
      if (logo?.publicUrl) {
        const { error: updateErr } = await supabase
          .from("clubs")
          .update({ logo_url: logo.publicUrl })
          .eq("id", clubId);

        if (updateErr) throw new Error(`Saving logo URL failed: ${updateErr.message}`);
      }

      // 4) Create funding sources
      await createFundingSources(clubId);

      // Done
      setOpen(false);
      reset();
      router.refresh();

      // If you want to auto-enter:
      // router.push(`/clubs/${clubId}`);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 active:scale-[0.99] transition"
      >
        + New club
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !loading && setOpen(false)}
          />

          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-lg">
              {/* header */}
              <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4">
                <div>
                  <div className="text-base font-semibold text-zinc-900">Create club</div>
                  <div className="mt-0.5 text-sm text-zinc-500">
                    Set up branding and default funding sources.
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

              {/* body */}
              <div className="px-6 py-5 space-y-6">
                {/* Club name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-900">Club name *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    placeholder="DISC"
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    autoFocus
                  />
                </div>

                {/* Logo upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-900">Club logo (optional)</label>

                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                      {logoPreview ? (
                        <img src={logoPreview} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full" />
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition">
                        <Upload className="h-4 w-4" />
                        Upload image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={loading}
                          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                        />
                      </label>

                      {logoFile && (
                        <button
                          type="button"
                          onClick={() => onPickFile(null)}
                          disabled={loading}
                          className="text-left text-xs text-zinc-500 hover:text-zinc-700 transition"
                        >
                          Remove image
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-zinc-500">
                    PNG/JPG works best. Square image recommended.
                  </div>
                </div>

                {/* Funding sources */}
                <div className="space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-zinc-900">Funding sources</div>
                      <div className="text-xs text-zinc-500">
                        Add default sources and optional starting allocations.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addFundingSource}
                      disabled={loading}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {fundingSources.map((s, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 gap-2 rounded-2xl border border-zinc-200 bg-white p-3 sm:grid-cols-[1fr_180px_40px]"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-zinc-600">Name</div>
                          <input
                            value={s.name}
                            onChange={(e) => updateFundingSource(idx, { name: e.target.value })}
                            disabled={loading}
                            placeholder="ATC"
                            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs font-medium text-zinc-600">Allocation (optional)</div>
                          <input
                            value={s.allocation}
                            onChange={(e) => updateFundingSource(idx, { allocation: e.target.value })}
                            disabled={loading}
                            inputMode="decimal"
                            placeholder="500"
                            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                          />
                        </div>

                        <div className="flex items-end justify-end">
                          <button
                            type="button"
                            onClick={() => removeFundingSource(idx)}
                            disabled={loading || fundingSources.length <= 1}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition"
                            aria-label="Remove funding source"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              {/* footer */}
              <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => !loading && (setOpen(false), reset())}
                  className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={onCreate}
                  className="h-10 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60 disabled:hover:bg-zinc-900 transition"
                >
                  {loading ? "Creating..." : "Create club"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
