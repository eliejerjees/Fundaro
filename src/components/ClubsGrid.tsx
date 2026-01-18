"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Shield, Users, Eye, ChevronRight } from "lucide-react";
import ClubActionsMenu from "@/components/ClubActionsMenu";

export type ClubRow = {
  role: "admin" | "officer" | "viewer";
  club: {
    id: string;
    name: string;
    logo_url: string | null;
  };
};

function roleMeta(role: ClubRow["role"]) {
  if (role === "admin") {
    return { label: "Admin", Icon: Shield, pill: "bg-blue-50 text-blue-700 ring-blue-200" };
  }
  if (role === "officer") {
    return {
      label: "Officer",
      Icon: Users,
      pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    };
  }
  return { label: "Viewer", Icon: Eye, pill: "bg-zinc-50 text-zinc-700 ring-zinc-200" };
}

export default function ClubsGrid({ clubs }: { clubs: ClubRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return clubs;
    return clubs.filter(({ club, role }) => {
      const meta = roleMeta(role);
      return (
        club.name.toLowerCase().includes(normalized) ||
        meta.label.toLowerCase().includes(normalized)
      );
    });
  }, [clubs, query]);

  return (
    <>
      <div className="mt-6">
        <div className="relative w-full sm:max-w-sm">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clubs..."
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white">
            <Plus className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-zinc-900">
            {clubs.length === 0 ? "No clubs yet" : "No matches"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {clubs.length === 0
              ? "Create your first club to track expenses and keep budgets clean."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ club, role }) => {
            const meta = roleMeta(role);
            const RoleIcon = meta.Icon;

            return (
              <div
                key={club.id}
                className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-zinc-300 transition relative"
              >
                <div className="absolute right-3 top-3">
                  <ClubActionsMenu club={club} canManage={role !== "viewer"} />
                </div>

                <Link href={`/clubs/${club.id}`} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {club.logo_url ? (
                        <img
                          src={club.logo_url}
                          alt=""
                          className="h-11 w-11 rounded-xl object-cover border border-zinc-200 bg-zinc-100"
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-100 to-zinc-200" />
                      )}

                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-900">
                          {club.name}
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-zinc-500">
                          <RoleIcon className="h-3.5 w-3.5" />
                          {meta.label}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-zinc-400 group-hover:text-zinc-700 transition" />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.pill}`}
                    >
                      {meta.label}
                    </span>
                    <span className="text-xs text-zinc-500">Open</span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
