import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CategoryPie from "@/components/CategoryPie";

export const dynamic = "force-dynamic";

export default async function ClubPage(props: {
  params: Promise<{ clubId: string }>;
  searchParams?: Promise<{ year?: string }>;
}) {
  const { clubId } = await props.params;
  const sp = (await props.searchParams) ?? {};
  const selectedYearId = sp.year ?? null;

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

  let activeYear = years?.[0] ?? null;

  if (selectedYearId && years?.some((y) => y.id === selectedYearId)) {
    activeYear = years.find((y) => y.id === selectedYearId) ?? activeYear;
  }

  let categoryTotals: { category: string; total: number }[] = [];

  if (activeYear) {
    const { data: expenses, error: catErr } = await supabase
      .from("expenses")
      .select("category, id")
      .eq("club_year_id", activeYear.id);

    if (catErr) return <pre className="p-8">{catErr.message}</pre>;

    // sum category totals by joining funding lines amounts (most accurate)
    const { data: lines, error: linesErr } = await supabase
      .from("expense_funding_lines")
      .select("amount, expense_id")
      .eq("club_year_id", activeYear.id);

    if (linesErr) return <pre className="p-8">{linesErr.message}</pre>;

    const expCategory = new Map<string, string>();
    (expenses ?? []).forEach((e) => expCategory.set(e.id, e.category));

    const sums = new Map<string, number>();
    (lines ?? []).forEach((l) => {
      const cat = expCategory.get(l.expense_id) ?? "Other";
      sums.set(cat, (sums.get(cat) ?? 0) + Number(l.amount));
    });

    categoryTotals = Array.from(sums.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }

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

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {activeYear
              ? `Showing: ${activeYear.label}`
              : "No year yet"}
          </div>

          {years && years.length > 0 && (
            <form action="" method="get">
              <select
                name="year"
                defaultValue={activeYear?.id ?? ""}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                  </option>
                ))}
              </select>
              <button className="ml-2 rounded-md border px-3 py-2 text-sm">
                Go
              </button>
            </form>
          )}
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

        <div className="rounded-2xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Spending Breakdown</div>
              <div className="text-sm text-muted-foreground">By category</div>
            </div>
          </div>

          <div className="mt-4">
            <CategoryPie data={categoryTotals} />
          </div>
        </div>
      </div>
    </div>
  );
}
