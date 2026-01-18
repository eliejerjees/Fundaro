"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { Menu, X } from "lucide-react";

type NavItem = { label: string; href: string };

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={[
        "block rounded-lg px-3 py-2 text-sm transition",
        active
          ? "bg-[rgb(var(--muted))] text-[rgb(var(--fg))]"
          : "text-[rgb(var(--muted-fg))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]",
      ].join(" ")}
    >
      {item.label}
    </Link>
  );
}

export default function AppShell({
  children,
  clubId,
}: {
  children: React.ReactNode;
  clubId?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav: NavItem[] = useMemo(() => {
    const base: NavItem[] = [{ label: "Clubs", href: "/clubs" }];
    if (clubId) {
      base.push(
        { label: "Dashboard", href: `/clubs/${clubId}` },
        { label: "Expenses", href: `/clubs/${clubId}/expenses` },
        { label: "Funding", href: `/clubs/${clubId}/funding` }
      );
    }
    return base;
  }, [clubId]);

  const Sidebar = (
    <div className="h-full w-72 border-r border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/clubs" className="text-lg font-semibold tracking-tight">
          Fundaro
        </Link>
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
      </div>

      <div className="space-y-1">
        {nav.map((item) => (
          <NavLink key={item.href} item={item} active={pathname === item.href} />
        ))}
      </div>

      <div className="mt-8 text-xs text-[rgb(var(--muted-fg))]">
        Simple finance tracking for clubs.
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 border-b border-[rgb(var(--border))] bg-[rgb(var(--card))] lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-2"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/clubs" className="font-semibold tracking-tight">
            Fundaro
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Desktop layout */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 lg:grid-cols-[288px_1fr]">
        <div className="hidden lg:block">{Sidebar}</div>

        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] shadow-[var(--shadow)]">
            <div className="flex items-center justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
              <div className="font-semibold">Menu</div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-2"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {Sidebar}
          </div>
        </div>
      )}
    </div>
  );
}
