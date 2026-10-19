"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { AppStyle } from "@/config/styles";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { BrandMark, Icon, type IconName } from "./icons";
import { StyleToggle } from "./StyleSwitch";

const LINKS: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  {
    href: "/library",
    label: "Libreria",
    icon: "library",
    match: (p) => ["/library", "/documents", "/maps", "/decks"].some((s) => p.startsWith(s)),
  },
  { href: "/upload", label: "Carica materiale", icon: "upload", match: (p) => p.startsWith("/upload") },
  { href: "/settings", label: "Impostazioni", icon: "settings", match: (p) => p.startsWith("/settings") },
];

function Brand() {
  return (
    <Link href="/library" className="flex items-center gap-2.5 rounded-lg px-2 py-1 text-[17px] font-bold">
      <BrandMark />
      StudyMap
    </Link>
  );
}

function Links({ pathname }: { pathname: string }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {LINKS.map((l) => {
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
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Account({ email, plan, appStyle }: { email: string; plan: "free" | "pro"; appStyle: AppStyle }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <StyleToggle initial={appStyle} />
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

export function AppNav({ email, plan, appStyle }: { email: string; plan: "free" | "pro"; appStyle: AppStyle }) {
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
        <Links pathname={pathname} />
        <div className="mt-auto">
          <Account email={email} plan={plan} appStyle={appStyle} />
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
          <Links pathname={pathname} />
          <Account email={email} plan={plan} appStyle={appStyle} />
        </nav>
      )}
    </>
  );
}
