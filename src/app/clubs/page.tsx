import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewClubModal from "@/components/NewClubModal";
import ClubsGrid from "@/components/ClubsGrid";
import { LogOut } from "lucide-react";

type Club = {
  id: string;
  name: string;
  logo_url: string | null;
};

type MembershipRow = {
  role: "admin" | "officer" | "viewer";
  clubs: Club | Club[] | null;
};

function firstClub(value: MembershipRow["clubs"]): Club | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function ClubsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: memberships, error } = await supabase
    .from("club_memberships")
    .select("role, clubs:club_id (id, name, logo_url)")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Error loading clubs</div>
            <pre className="mt-3 overflow-auto rounded-xl bg-zinc-900 p-4 text-xs text-zinc-100">
              {error.message}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  const rows = (memberships ?? []) as MembershipRow[];
  const clubs = rows
    .map((m) => ({ role: m.role, club: firstClub(m.clubs) }))
    .filter((x): x is { role: MembershipRow["role"]; club: Club } => Boolean(x.club));

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="min-w-0">
            <div className="text-sm font-medium text-zinc-900">Fundaro</div>
            <div className="text-xs text-zinc-500">Clubs</div>
          </div>

          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 active:scale-[0.99] transition"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header + single create button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Your clubs</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Manage budgets, expenses, and funding sources in one place.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <NewClubModal />
          </div>
        </div>

        <ClubsGrid clubs={clubs} />

        <div className="h-10" />
      </div>
    </div>
  );
}
