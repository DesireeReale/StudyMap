"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const STAGES = [
  { scale: 1, origin: "50% 50%" },
  { scale: 1.9, origin: "52% 45%" },
  { scale: 3.1, origin: "62% 72%" },
];

export function Showcase() {
  const markers = useRef<(HTMLDivElement | null)[]>([]);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setStage(Number((e.target as HTMLElement).dataset.stage));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    markers.current.forEach((m) => m && io.observe(m));
    return () => io.disconnect();
  }, []);

  const s = STAGES[stage]!;

  return (
    <section aria-labelledby="showcase-title" className="relative h-[200vh]">
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center gap-6 overflow-hidden px-4 md:gap-8">
        <h2
          id="showcase-title"
          className="section-display text-center"
        >
          <span className="block">Dal capitolo intero</span>
          <span className={`block transition-[opacity,transform] duration-700 ${stage > 0 ? "opacity-100" : "translate-y-4 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100"}`}>
            al singolo concetto.
          </span>
        </h2>
        <div className="grid w-full max-w-[1100px] items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="mx-auto aspect-[16/9] w-full max-w-[760px] overflow-hidden rounded-row bg-surface md:w-[54vw]">
            <Image
              src="/landing/map.png"
              alt="Mappa concettuale sullo scompenso cardiaco generata da StudyMap, con cause, segni e sintomi e interventi infermieristici"
              width={1140}
              height={638}
              sizes="(min-width: 768px) 54vw, 100vw"
              className="size-full object-cover transition-transform duration-700 ease-out motion-reduce:transition-none"
              style={{ transform: `scale(${s.scale})`, transformOrigin: s.origin }}
            />
          </div>
          <p
            className={`max-w-[28ch] text-[17px] leading-relaxed transition-opacity duration-500 ${
              stage === 2 ? "opacity-100" : "opacity-0 motion-reduce:opacity-100"
            }`}
          >
            Ogni concetto è un nodo che puoi rinominare, spostare o colorare. Le relazioni restano scritte sulle frecce.
          </p>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {STAGES.map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              markers.current[i] = el;
            }}
            data-stage={i}
            className="absolute h-px w-full"
            style={{ top: `${i * 30 + 10}%` }}
          />
        ))}
      </div>
    </section>
  );
}
