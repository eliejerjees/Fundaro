// src/app/clubs/[clubId]/expenses/page.tsx
export const revalidate = 0;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddExpenseModal from "@/components/AddExpenseModal";
import EditExpenseModal from "@/components/EditExpenseModal";

export const dynamic = "force-dynamic";

type YearRow = {
  id: string;
  label: string;
  is_active: boolean;
  start_date: string;
};

type SourceRow = {
  id: string;
  name: string;
};

type ExpenseRow = {
  id: string;
  occurred_on: string;
  vendor: string;
  category: string;
  description: string | null;
  expense_funding_lines: {
    id: string;
    funding_source_id: string;
    amount: number;
  }[];
};

export default async function ExpensesPage(props: {
  params: Promise<{ clubId: string }>;
  searchParams?: Promise<{ year?: string }>;
}) {
  const { clubId } = await props.params;
  const sp = (await props.searchParams) ?? {};
  const selectedYearId = sp.year ?? null;

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) return <pre className="p-8">{userErr.message}</pre>;
  if (!userData.user) redirect("/login");

  // years
  const { data: years, error: yearsErr } = await supabase
    .from("club_years")
    .select("id, label, is_active, start_date")
    .eq("club_id", clubId)
    .order("is_active", { ascending: false })
    .order("start_date", { ascending: false })
    .returns<YearRow[]>();

  if (yearsErr) return <pre className="p-8">{yearsErr.message}</pre>;

  let activeYear: YearRow | null = years?.[0] ?? null;
  if (selectedYearId && years?.some((y) => y.id === selectedYearId)) {
    activeYear = years.find((y) => y.id === selectedYearId) ?? activeYear;
  }

  if (!activeYear) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <div className="mt-2 text-sm text-muted-foreground">No year set yet.</div>
      </div>
    );
  }

  // funding sources
  const { data: sources, error: sourcesErr } = await supabase
    .from("funding_sources")
    .select("id, name")
    .eq("club_id", clubId)
    .order("name", { ascending: true })
    .returns<SourceRow[]>();

  if (sourcesErr) return <pre className="p-8">{sourcesErr.message}</pre>;

  // expenses (include funding lines)
  const { data: expenses, error: expensesErr } = await supabase
    .from("expenses")
    .select(
      `
      id,
      occurred_on,
      vendor,
      category,
      description,
      expense_funding_lines (
        id,
        funding_source_id,
        amount
      )
    `
    )
    .eq("club_year_id", activeYear.id)
    .order("occurred_on", { ascending: false })
    .returns<ExpenseRow[]>();

  if (expensesErr) return <pre className="p-8">{expensesErr.message}</pre>;

  // allocations for the active year (term = year)
  const { data: allocs, error: allocErr } = await supabase
    .from("funding_allocations")
    .select("funding_source_id, amount")
    .eq("club_year_id", activeYear.id)
    .eq("term", "year");

  if (allocErr) return <pre className="p-8">{allocErr.message}</pre>;

  // spent in the active year (all lines, to compute remaining per source)
  const { data: spentLines, error: spentErr } = await supabase
    .from("expense_funding_lines")
    .select("funding_source_id, amount")
    .eq("club_year_id", activeYear.id);

  if (spentErr) return <pre className="p-8">{spentErr.message}</pre>;

  const allocMap = new Map<string, number>();
  (allocs ?? []).forEach((a: any) => {
    allocMap.set(a.funding_source_id, Number(a.amount));
  });

  const spentMap = new Map<string, number>();
  (spentLines ?? []).forEach((l: any) => {
    spentMap.set(
      l.funding_source_id,
      (spentMap.get(l.funding_source_id) ?? 0) + Number(l.amount)
    );
  });

  const sourcesWithRemaining = (sources ?? []).map((s) => {
    const allocated = allocMap.get(s.id) ?? 0;
    const spent = spentMap.get(s.id) ?? 0;
    return { id: s.id, name: s.name, remaining: allocated - spent };
  });

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="text-sm text-muted-foreground">
              Showing: {activeYear.label}
            </div>

            {years && years.length > 0 && (
              <form action="" method="get" className="flex items-center gap-2">
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
                <button
                  type="submit"
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  Go
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            className="rounded-md border px-3 py-2 text-sm"
            href={`/api/clubs/${clubId}/expenses.csv?year=${activeYear.id}`}
          >
            Export CSV
          </a>
          <AddExpenseModal
            clubId={clubId}
            sources={sourcesWithRemaining}
          />
        </div>
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
                  <EditExpenseModal
                    clubId={clubId}
                    expense={e}
                    sources={sourcesWithRemaining}
                  />
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
