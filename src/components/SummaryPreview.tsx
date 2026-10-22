"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

export function Preview({ children, href, label }: { children: React.ReactNode; href: string; label: string }) {
  const [long, setLong] = useState(true);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (el) setLong(el.scrollHeight > el.clientHeight + 8);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={box}
        className={`relative max-h-[380px] w-full overflow-hidden ${long ? "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-28 after:rounded-b-row after:bg-linear-to-t after:from-sheet after:to-transparent" : ""}`}
      >
        {children}
      </div>
      <Link href={href} className="btn-secondary">
        {label}
        <Icon name="back" className="rotate-180" />
      </Link>
    </div>
  );
}
