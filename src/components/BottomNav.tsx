"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: "H" },
  { href: "/train", label: "Train", icon: "T" },
  { href: "/history", label: "History", icon: "⏱" },
  { href: "/eat", label: "Eat", icon: "E" },
  { href: "/recover", label: "Recover", icon: "R" },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide nav during active workout
  if (pathname.startsWith("/workout/") && !pathname.includes("/summary")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-50">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center py-3 text-xs transition-colors",
                active ? "text-white" : "text-zinc-500"
              )}
            >
              <span className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-0.5",
                active ? "bg-white text-black" : "bg-zinc-800 text-zinc-400"
              )}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
