"use client";

import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from "recharts";

export default function CategoryPie({
  data,
}: {
  data: { category: string; total: number }[];
}) {
  if (!data.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No spending yet this year.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            outerRadius={110}
            label
          >
            {data.map((_, idx) => (
              <Cell key={idx} />
            ))}
          </Pie>
          <Tooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
