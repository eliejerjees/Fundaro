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
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Clubs</h1>
        <form action="/auth/sign-out" method="post">
          <button className="rounded-md border px-3 py-2">Sign out</button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rows.map((m, idx) => {
          const club = firstClub(m.clubs);
          if (!club) return null;

          return (
            <Link
              key={`${club.id}-${idx}`}
              href={`/clubs/${club.id}`}
              className="rounded-2xl border p-6 hover:bg-muted/50 transition"
            >
              <div className="font-medium">{club.name}</div>
              <div className="text-sm text-muted-foreground">{m.role}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
