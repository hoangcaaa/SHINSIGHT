"use client";
/// Navigation links with active state via usePathname
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Live Feed", href: "/" },
  { label: "Revealed", href: "/revealed" },
  { label: "Oracles", href: "/oracles" },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-6">
      {NAV_ITEMS.map(({ label, href }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "text-sm font-medium transition-colors",
              isActive
                ? "text-[#EF9F27]"
                : "text-[#888780] hover:text-[#F5F5F0]",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
