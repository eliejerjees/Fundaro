export const revalidate = 0;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddExpenseModal from "@/components/AddExpenseModal";

export const dynamic = "force-dynamic";

export default async function ExpensesPage(props: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await props.params;

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

  const activeYear = years?.[0] ?? null;

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <div className="text-sm text-muted-foreground">{activeYear.label}</div>
        </div>

        <AddExpenseModal
          clubId={clubId}
          clubYearId={activeYear.id}
          sources={sources ?? []}
        />
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="p-3">Date</th>
              <th className="p-3">Vendor</th>
              <th className="p-3">Category</th>
              <th className="p-3">Description</th>
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
              </tr>
            ))}
            {(expenses?.length ?? 0) === 0 && (
              <tr>
                <td className="p-6 text-muted-foreground" colSpan={4}>
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
