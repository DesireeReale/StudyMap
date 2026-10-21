"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Preferences } from "@/core/preferences";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { BrandMark, Icon, type IconName } from "./icons";
import { StyleToggle } from "./StyleSwitch";
import { MiniTimer } from "./StudyTimer";
import { SECTIONS, sectionHref, type SectionSlug } from "@/core/sections";

type NavLink = { href: string; label: string; icon: IconName; match: (p: string) => boolean; badge?: number };

const SECTION_ICONS: Record<SectionSlug, IconName> = {
  mappe: "map",
  flashcard: "cards",
  quiz: "check",
  riassunti: "note",
  documenti: "file",
};

function groups(due: number): { title?: string; links: NavLink[] }[] {
  return [
    {
      links: [
        { href: "/library", label: "Home", icon: "home", match: (p) => p.startsWith("/library") },
        { href: "/materie", label: "Materie", icon: "folder", match: (p) => ["/materie", "/folders", "/notes"].some((s) => p.startsWith(s)) },
      ],
    },
    {
      title: "Studia",
      links: SECTIONS.map((s) => ({
        href: sectionHref(s.slug),
        label: s.label,
        icon: SECTION_ICONS[s.slug],
        match: (p: string) => p.startsWith(sectionHref(s.slug)) || s.prefixes.some((x) => p.startsWith(x)),
        badge: s.slug === "flashcard" && due > 0 ? due : undefined,
      })),
    },
    {
      links: [
        { href: "/upload", label: "Carica materiale", icon: "upload", match: (p) => p.startsWith("/upload") },
        { href: "/settings", label: "Impostazioni", icon: "settings", match: (p) => p.startsWith("/settings") },
      ],
    },
  ];
}

function Brand() {
  return (
    <Link href="/library" className="flex items-center gap-2.5 rounded-lg px-2 py-1 text-[17px] font-bold">
      <BrandMark />
      StudyMap
    </Link>
  );
}

function Links({ pathname, due }: { pathname: string; due: number }) {
  return (
    <div className="flex flex-col gap-3">
      {groups(due).map((g, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          {g.title && <p className="px-3 pb-1 text-[12px] font-bold tracking-[0.04em] text-muted uppercase">{g.title}</p>}
          <ul className="flex flex-col gap-0.5">
            {g.links.map((l) => {
              const active = l.match(pathname);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-[15px] transition-colors duration-150 ${
                      active ? "bg-active font-bold text-ink" : "text-muted hover:bg-active hover:text-ink"
                    }`}
                  >
                    <Icon name={l.icon} />
                    {l.label}
                    {l.badge !== undefined && (
                      <span className="num ml-auto rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-bold text-ink">
                        {l.badge}
                        <span className="sr-only"> da ripassare oggi</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Account({ email, plan, prefs }: { email: string; plan: "free" | "pro"; prefs: Preferences }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <MiniTimer />
      <p className="flex items-center gap-1.5 px-3 text-[13px] text-muted" aria-hidden="true">
        <Icon name="layout" size={14} />
        Cambia tema
      </p>
      <StyleToggle initial={prefs} />
      <p className="px-3 text-sm text-muted">
        Piano <span className="font-bold text-ink">{plan === "pro" ? "Pro" : "Free"}</span>
      </p>
      <p className="truncate px-3 text-sm text-muted" title={email}>
        {email}
      </p>
      <button
        type="button"
        className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left text-[15px] text-muted transition-colors duration-150 hover:bg-active hover:text-ink"
        onClick={async () => {
          await supabaseBrowser().auth.signOut();
          router.push("/");
          router.refresh();
        }}
      >
        <Icon name="logout" />
        Esci
      </button>
    </div>
  );
}

export function AppNav({
  email,
  plan,
  prefs,
  due,
}: {
  email: string;
  plan: "free" | "pro";
  prefs: Preferences;
  due: number;
}) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  return (
    <>
      <nav
        aria-label="Principale"
        className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-6 px-3 py-5 md:flex"
      >
        <Brand />
        <Links pathname={pathname} due={due} />
        <div className="mt-auto">
          <Account email={email} plan={plan} prefs={prefs} />
        </div>
      </nav>

      <div className="sticky top-0 z-20 flex h-14 items-center justify-between bg-chrome px-3 md:hidden">
        <Brand />
        <button
          type="button"
          className="flex size-11 cursor-pointer items-center justify-center rounded-lg hover:bg-active"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Chiudi il menu" : "Apri il menu"}
          onClick={() => setOpenOn(open ? null : pathname)}
        >
          <Icon name={open ? "close" : "menu"} size={22} />
        </button>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Principale"
          className="fixed inset-x-0 top-14 bottom-0 z-20 flex flex-col gap-6 overflow-y-auto bg-chrome px-3 pb-6 md:hidden"
        >
          <Links pathname={pathname} due={due} />
          <Account email={email} plan={plan} prefs={prefs} />
        </nav>
      )}
    </>
  );
}
