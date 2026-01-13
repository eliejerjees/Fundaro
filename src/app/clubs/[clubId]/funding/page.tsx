import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  // active year
  const { data: years, error: yearsErr } = await supabase
    .from("club_years")
    .select("id, label, is_active, start_date")
    .eq("club_id", clubId)
    .order("is_active", { ascending: false })
    .order("start_date", { ascending: false });

  if (yearsErr) return <pre>{yearsErr.message}</pre>;

  let activeYear = years?.[0] ?? null;

  if (selectedYearId && years?.some((y) => y.id === selectedYearId)) {
    activeYear = years.find((y) => y.id === selectedYearId) ?? activeYear;
  }
  if (!activeYear) return <div>No year set yet.</div>;

  // funding sources
  const { data: sources, error: srcErr } = await supabase
    .from("funding_sources")
    .select("id, name, notes")
    .eq("club_id", clubId)
    .order("name", { ascending: true });

  if (srcErr) return <pre>{srcErr.message}</pre>;

  // allocations for the active year (year term)
  const { data: allocs, error: allocErr } = await supabase
    .from("funding_allocations")
    .select("funding_source_id, term, amount")
    .eq("club_year_id", activeYear.id)
    .eq("term", "year");

  if (allocErr) return <pre>{allocErr.message}</pre>;

  const { data: spentLines, error: spentErr } = await supabase
    .from("expense_funding_lines")
    .select("funding_source_id, amount")
    .eq("club_year_id", activeYear.id);

  if (spentErr) return <pre>{spentErr.message}</pre>;

  const spentMap = new Map<string, number>();
  (spentLines ?? []).forEach((l) => {
    spentMap.set(
      l.funding_source_id,
      (spentMap.get(l.funding_source_id) ?? 0) + Number(l.amount)
    );
  });

  const allocMap = new Map<string, number>();
  (allocs ?? []).forEach((a) => {
    allocMap.set(a.funding_source_id, Number(a.amount));
  });

  const totalAllocated = (sources ?? []).reduce(
    (sum, s) => sum + (allocMap.get(s.id) ?? 0),
    0
  );

  const totalSpent = (sources ?? []).reduce(
    (sum, s) => sum + (spentMap.get(s.id) ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Funding</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Showing: {activeYear.label}
          </div>

          {years && years.length > 0 && (
            <form action="" method="get">
              <select
                name="year"
                defaultValue={activeYear.id}
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
          <div className="text-sm text-muted-foreground">Allocated (Year)</div>
          <div className="text-2xl font-semibold">
            ${totalAllocated.toFixed(2)}
          </div>
        </div>
        <div className="rounded-2xl border p-6">
          <div className="text-sm text-muted-foreground">Spent (Year)</div>
          <div className="text-2xl font-semibold">${totalSpent.toFixed(2)}</div>
        </div>
        <div className="rounded-2xl border p-6">
          <div className="text-sm text-muted-foreground">Remaining (Year)</div>
          <div className="text-2xl font-semibold">
            ${(totalAllocated - totalSpent).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="p-3">Source</th>
              <th className="p-3">Allocated</th>
              <th className="p-3">Spent</th>
              <th className="p-3">Remaining</th>
              <th className="p-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {(sources ?? []).map((s) => {
              const allocated = allocMap.get(s.id) ?? 0;
              const spent = spentMap.get(s.id) ?? 0;
              const remaining = allocated - spent;

              return (
                <tr key={s.id} className="border-t">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3">${allocated.toFixed(2)}</td>
                  <td className="p-3">${spent.toFixed(2)}</td>
                  <td className="p-3">${remaining.toFixed(2)}</td>
                  <td className="p-3 text-muted-foreground">
                    {s.notes ?? "—"}
                  </td>
                </tr>
              );
            })}

            {(sources?.length ?? 0) === 0 && (
              <tr>
                <td className="p-6 text-muted-foreground" colSpan={5}>
                  No funding sources yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
