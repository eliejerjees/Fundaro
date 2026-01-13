"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Props = {
  receiptPath: string;
};

export default function ViewReceiptButton({ receiptPath }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);

  async function onView() {
    try {
      setLoading(true);

      const { data, error } = await supabase.storage
        .from("receipts")
        .createSignedUrl(receiptPath, 60);

      if (error) throw new Error(error.message);
      if (!data?.signedUrl) throw new Error("Failed to create signed URL.");

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e?.message ?? "Failed to open receipt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onView}
      disabled={loading}
      className="rounded-md border px-2 py-1 text-xs disabled:opacity-60"
    >
      {loading ? "Loading..." : "View receipt"}
    </button>
  );
}
