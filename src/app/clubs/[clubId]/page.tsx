import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClubPage(props: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await props.params;

  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  // fetch club (RLS protected)
  const { data: club, error: clubErr } = await supabase
    .from("clubs")
    .select("id, name, logo_url")
    .eq("id", clubId)
    .single();

  if (clubErr) return <pre className="p-8">{clubErr.message}</pre>;

  // fetch years
  const { data: years, error: yearsErr } = await supabase
    .from("club_years")
    .select("id, label, start_date, end_date, is_active")
    .eq("club_id", clubId)
    .order("is_active", { ascending: false })
    .order("start_date", { ascending: false });

  if (yearsErr) return <pre className="p-8">{yearsErr.message}</pre>;

  const activeYear = years?.[0] ?? null;

  let totalBudget = 0;

  if (activeYear) {
    const { data: allocs, error: allocErr } = await supabase
      .from("funding_allocations")
      .select("amount")
      .eq("club_year_id", activeYear.id)
      .eq("term", "year");

    if (allocErr) return <pre className="p-8">{allocErr.message}</pre>;

    totalBudget = (allocs ?? []).reduce((sum, a) => sum + Number(a.amount), 0);
  }

  let spent = 0;

  if (activeYear) {
    const { data: lines, error: linesErr } = await supabase
      .from("expense_funding_lines")
      .select("amount")
      .eq("club_year_id", activeYear.id);

    if (linesErr) return <pre className="p-8">{linesErr.message}</pre>;

    spent = (lines ?? []).reduce((sum, l) => sum + Number(l.amount), 0);
  }

  const remaining = totalBudget - spent;

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
