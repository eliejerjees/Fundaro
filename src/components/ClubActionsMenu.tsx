"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import EditClubModal from "@/components/EditClubModal";
import DeleteClubDialog from "@/components/DeleteClubDialog";

type Club = {
  id: string;
  name: string;
  logo_url: string | null;
};

export default function ClubActionsMenu({
  club,
  canManage = true,
}: {
  club: Club;
  canManage?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  if (!canManage) return null;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50 transition"
        aria-label="Club actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 w-44 rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden z-50"
        >
          <EditClubModal
            club={club}
            canManage={canManage}
            trigger={
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50 flex items-center gap-2"
              >
                <Pencil className="h-4 w-4 text-zinc-500" />
                Edit
              </button>
            }
          />

          <DeleteClubDialog
            club={club}
            canManage={canManage}
            trigger={
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
                Delete
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}
