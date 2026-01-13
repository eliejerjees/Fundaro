export const revalidate = 0;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddExpenseModal from "@/components/AddExpenseModal";
import EditExpenseModal from "@/components/EditExpenseModal";

export const dynamic = "force-dynamic";

export default async function ExpensesPage(props: {
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
  const { data: years } = await supabase
    .from("club_years")
    .select("id, label, is_active, start_date")
    .eq("club_id", clubId)
    .order("is_active", { ascending: false })
    .order("start_date", { ascending: false });

  let activeYear = years?.[0] ?? null;
  if (selectedYearId && years?.some((y) => y.id === selectedYearId)) {
    activeYear = years.find((y) => y.id === selectedYearId) ?? activeYear;
  }

  const { data: sources, error: sourcesErr } = await supabase
    .from("funding_sources")
    .select("id, name")
    .eq("club_id", clubId)
    .order("name", { ascending: true });

  if (sourcesErr) return <pre>{sourcesErr.message}</pre>;

  if (!activeYear) {
    return <div>No year set yet.</div>;
  }

  const { data: expenses, error } = await supabase
    .from("expenses")
    .select("id, occurred_on, vendor, category, description")
    .eq("club_year_id", activeYear.id)
    .order("occurred_on", { ascending: false });

  if (error) return <pre>{error.message}</pre>;

  const { data: allocs } = await supabase
    .from("funding_allocations")
    .select("funding_source_id, amount")
    .eq("club_year_id", activeYear.id)
    .eq("term", "year");

  const { data: spentLines } = await supabase
    .from("expense_funding_lines")
    .select("funding_source_id, amount")
    .eq("club_year_id", activeYear.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {activeYear ? `Showing: ${activeYear.label}` : "No year yet"}
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

        <AddExpenseModal clubId={clubId} sources={sources ?? []} />
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="p-3">Date</th>
              <th className="p-3">Vendor</th>
              <th className="p-3">Category</th>
              <th className="p-3">Description</th>
              <th className="p-3">Edit</th>
            </tr>
          </thead>
          <tbody>
            {(expenses ?? []).map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">{e.occurred_on}</td>
                <td className="p-3 font-medium">{e.vendor}</td>
                <td className="p-3">{e.category}</td>
                <td className="p-3 text-muted-foreground">
                  {e.description ?? "—"}
                </td>
                <td className="p-3">
                  <EditExpenseModal expense={e} clubId={clubId} />
                </td>
              </tr>
            ))}
            {(expenses?.length ?? 0) === 0 && (
              <tr>
                <td className="p-6 text-muted-foreground" colSpan={5}>
                  No expenses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
