"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./icons";

export function Expandable({ children, more, less }: { children: React.ReactNode; more: string; less: string }) {
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const el = box.current;
    if (el) setLong(el.scrollHeight > el.clientHeight + 8);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        id={id}
        ref={box}
        className={`relative w-full ${open || !long ? "" : "max-h-[380px] overflow-hidden after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-28 after:rounded-b-row after:bg-linear-to-t after:from-sheet after:to-transparent"}`}
      >
        {children}
      </div>
      {long && (
        <button type="button" className="btn-secondary" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          <Icon name={open ? "up" : "down"} />
          {open ? less : more}
        </button>
      )}
    </div>
  );
}
