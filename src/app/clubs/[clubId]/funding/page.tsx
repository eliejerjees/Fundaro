import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FundingPage(props: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await props.params;

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

  const activeYear = years?.[0] ?? null;
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

  const allocMap = new Map<string, number>();
  (allocs ?? []).forEach((a) => {
    allocMap.set(a.funding_source_id, Number(a.amount));
  });

  const total = (sources ?? []).reduce(
    (sum, s) => sum + (allocMap.get(s.id) ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Funding</h1>
        <div className="text-sm text-muted-foreground">{activeYear.label}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border p-6">
          <div className="text-sm text-muted-foreground">Total Allocated</div>
          <div className="text-2xl font-semibold">${total.toFixed(2)}</div>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="p-3">Source</th>
              <th className="p-3">Allocated (Year)</th>
              <th className="p-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {(sources ?? []).map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">${(allocMap.get(s.id) ?? 0).toFixed(2)}</td>
                <td className="p-3 text-muted-foreground">{s.notes ?? "—"}</td>
              </tr>
            ))}

            {(sources?.length ?? 0) === 0 && (
              <tr>
                <td className="p-6 text-muted-foreground" colSpan={3}>
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
