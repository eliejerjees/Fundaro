import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  const tabs = [
    { name: "Overview", href: `/clubs/${clubId}` },
    { name: "Expenses", href: `/clubs/${clubId}/expenses` },
    { name: "Funding", href: `/clubs/${clubId}/funding` },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/clubs" className="text-sm underline">
          Back
        </Link>
      </div>

      <nav className="flex gap-6 border-b pb-2">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t.name}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
