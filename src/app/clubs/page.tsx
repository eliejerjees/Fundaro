import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Club = {
  id: string;
  name: string;
  logo_url: string | null;
};

type MembershipRow = {
  role: "admin" | "officer" | "viewer";
  clubs: Club | Club[] | null; // Supabase may return array
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

  console.log("memberships:", memberships, "error:", error);

  if (error) return <pre className="p-8">{error.message}</pre>;

  const rows = (memberships ?? []) as MembershipRow[];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{club.name}</h1>
        <div className="text-sm text-muted-foreground">
          {activeYear
            ? `Active year: ${activeYear.label} (${activeYear.start_date} → ${activeYear.end_date})`
            : "No year yet"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border p-6">
          <div className="text-sm text-muted-foreground">Total Budget</div>
          <div className="text-2xl font-semibold">
            ${totalBudget.toFixed(2)}
          </div>
        </div>

        <div className="rounded-2xl border p-6">
          <div className="text-sm text-muted-foreground">Spent</div>
          <div className="text-2xl font-semibold">${spent.toFixed(2)}</div>
        </div>

        <div className="rounded-2xl border p-6">
          <div className="text-sm text-muted-foreground">Remaining</div>
          <div className="text-2xl font-semibold">${remaining.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
