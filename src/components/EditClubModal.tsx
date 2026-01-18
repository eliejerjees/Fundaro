"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Plus, Trash2, X, Upload } from "lucide-react";

type Club = { id: string; name: string; logo_url: string | null };
type FundingSourceDraft = { id?: string; name: string; tempId: string };

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

export default function EditClubModal({
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
  const [name, setName] = useState(club.name);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(club.logo_url);
  const [fundingSources, setFundingSources] = useState<FundingSourceDraft[]>([]);
  const [originalSources, setOriginalSources] = useState<FundingSourceDraft[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) return null;

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadSources() {
      setSourcesLoading(true);
      setError(null);
      setName(club.name);
      setLogoFile(null);
      setLogoPreview(club.logo_url);

      const { data, error: loadError } = await supabase
        .from("funding_sources")
        .select("id, name")
        .eq("club_id", club.id)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (loadError) {
        setError(loadError.message);
        setSourcesLoading(false);
        return;
      }

      const normalized = (data ?? []).map((row) => ({
        id: row.id,
        name: row.name ?? "",
        tempId: row.id,
      }));

      setFundingSources(normalized);
      setOriginalSources(normalized);
      setSourcesLoading(false);
    }

    loadSources();

    return () => {
      cancelled = true;
    };
  }, [open, club.id, club.logo_url, club.name, supabase]);

  function onPickFile(file: File | null) {
    setLogoFile(file);
    if (!file) {
      setLogoPreview(club.logo_url);
      return;
    }
    setLogoPreview(URL.createObjectURL(file));
  }

  function addFundingSource() {
    setFundingSources((prev) => [
      ...prev,
      { name: "", tempId: Math.random().toString(36).slice(2) },
    ]);
  }

  function removeFundingSource(tempId: string) {
    setFundingSources((prev) => prev.filter((s) => s.tempId !== tempId));
  }

  function updateFundingSource(tempId: string, name: string) {
    setFundingSources((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, name } : s))
    );
  }

  async function uploadLogo(): Promise<string | null> {
    if (!logoFile) return null;

    const bucket = "club-logos";
    const ext = logoFile.name.split(".").pop() || "png";
    const safe = slugify(name || "club");
    const path = `${club.id}/${safe}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, logoFile, { cacheControl: "3600", upsert: false, contentType: logoFile.type });

    if (uploadError) throw new Error(`Logo upload failed: ${uploadError.message}`);

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl ?? null;
  }

  async function onSave() {
    setError(null);
    if (!canManage) return setError("You do not have permission to edit this club.");
    const trimmed = name.trim();
    if (!trimmed) return setError("Club name is required.");
    if (sourcesLoading) return setError("Funding sources are still loading.");

    const normalizedSources = fundingSources
      .map((s) => ({ ...s, name: s.name.trim() }))
      .filter((s) => s.name.length > 0 || Boolean(s.id));

    for (const source of normalizedSources) {
      if (source.id && source.name.length === 0) {
        return setError("Funding source name is required.");
      }
    }

    const originalById = new Map(
      originalSources.filter((s) => s.id).map((s) => [s.id as string, s.name.trim()])
    );
    const currentIds = new Set(
      normalizedSources.filter((s) => s.id).map((s) => s.id as string)
    );
    const deletedIds = originalSources
      .filter((s) => s.id && !currentIds.has(s.id))
      .map((s) => s.id as string);

    setLoading(true);
    try {
      if (deletedIds.length > 0) {
        const { count: allocCount, error: allocError } = await supabase
          .from("funding_allocations")
          .select("id", { count: "exact", head: true })
          .in("funding_source_id", deletedIds);

        if (allocError) throw new Error(allocError.message);

        const { count: expenseCount, error: expenseError } = await supabase
          .from("expense_funding_lines")
          .select("id", { count: "exact", head: true })
          .in("funding_source_id", deletedIds);

        if (expenseError) throw new Error(expenseError.message);

        if ((allocCount ?? 0) > 0 || (expenseCount ?? 0) > 0) {
          throw new Error("Cannot delete a funding source that has allocations or expenses.");
        }
      }

      const newLogoUrl = await uploadLogo();

      const patch: Record<string, string> = { name: trimmed };
      if (newLogoUrl) patch.logo_url = newLogoUrl;

      const { error: updateErr } = await supabase.from("clubs").update(patch).eq("id", club.id);
      if (updateErr) throw new Error(updateErr.message);

      const newSources = normalizedSources.filter((s) => !s.id && s.name.length > 0);
      if (newSources.length > 0) {
        const rows = newSources.map((s) => ({ club_id: club.id, name: s.name }));
        const { error: insertError } = await supabase.from("funding_sources").insert(rows);
        if (insertError) throw new Error(insertError.message);
      }

      const updatedSources = normalizedSources.filter(
        (s) => s.id && originalById.get(s.id) !== s.name
      );
      if (updatedSources.length > 0) {
        const results = await Promise.all(
          updatedSources.map((s) =>
            supabase.from("funding_sources").update({ name: s.name }).eq("id", s.id)
          )
        );
        const updateError = results.find((result) => result.error)?.error;
        if (updateError) throw new Error(updateError.message);
      }

      if (deletedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("funding_sources")
          .delete()
          .in("id", deletedIds);
        if (deleteError) throw new Error(deleteError.message);
      }

      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

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
            <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white shadow-lg">
              <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4">
                <div>
                  <div className="text-base font-semibold text-zinc-900">Edit club</div>
                  <div className="mt-0.5 text-sm text-zinc-500">Update name and logo.</div>
                </div>
                <button
                  onClick={() => !loading && setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-900">Club name *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading || sourcesLoading}
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-900">Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                      {logoPreview ? (
                        <img src={logoPreview} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full" />
                      )}
                    </div>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition">
                      <Upload className="h-4 w-4" />
                      Upload image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={loading || sourcesLoading}
                        onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-zinc-900">Funding sources</div>
                      <div className="text-xs text-zinc-500">
                        Rename, add, or remove sources for this club.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addFundingSource}
                      disabled={loading || sourcesLoading}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>

                  {sourcesLoading ? (
                    <div className="text-xs text-zinc-500">Loading funding sources...</div>
                  ) : (
                    <div className="space-y-2">
                      {fundingSources.length === 0 && (
                        <div className="text-xs text-zinc-500">No funding sources yet.</div>
                      )}
                      {fundingSources.map((s) => (
                        <div
                          key={s.tempId}
                          className="grid grid-cols-1 gap-2 rounded-2xl border border-zinc-200 bg-white p-3 sm:grid-cols-[1fr_40px]"
                        >
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-zinc-600">Name</div>
                            <input
                              value={s.name}
                              onChange={(e) => updateFundingSource(s.tempId, e.target.value)}
                              disabled={loading || sourcesLoading}
                              placeholder="ATC"
                              className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                            />
                          </div>

                          <div className="flex items-end justify-end">
                            <button
                              type="button"
                              onClick={() => removeFundingSource(s.tempId)}
                              disabled={loading || sourcesLoading}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition"
                              aria-label="Remove funding source"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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
                  disabled={loading || sourcesLoading}
                  onClick={onSave}
                  className="h-10 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60 transition"
                >
                  {loading ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
