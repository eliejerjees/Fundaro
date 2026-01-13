import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await ctx.params;
  const url = new URL(req.url);
  const yearId = url.searchParams.get("year");

  if (!yearId) {
    return new NextResponse("Missing ?year=", { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return new NextResponse("Unauthorized", { status: 401 });

  // pull expenses + total using your view
  const { data, error } = await supabase
    .from("v_expenses_with_total")
    .select("occurred_on, vendor, category, description, total")
    .eq("club_id", clubId)
    .eq("club_year_id", yearId)
    .order("occurred_on", { ascending: false });

  if (error) return new NextResponse(error.message, { status: 400 });

  const header = ["Date", "Vendor", "Category", "Description", "Total"];
  const rows = (data ?? []).map((r) => [
    r.occurred_on,
    r.vendor,
    r.category,
    r.description ?? "",
    Number(r.total).toFixed(2),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expenses-${yearId}.csv"`,
    },
  });
}
