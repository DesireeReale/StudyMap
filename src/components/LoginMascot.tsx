"use client";

import { useEffect, useRef } from "react";

export type MascotPose = "idle" | "email" | "password" | "peek";

const IDLE_FROM = 0.1;
const IDLE_TO = 0.9;
const LOOK_FROM = 0.92;
const LOOK_TO = 1.42;
const LEAN_END = 3.3;
const HOLD = { peek: 3.5, password: 3.95 };
const IDLE_SPEED = 0.5;
const IDLE_PAUSE = 1200;
const LEAN_SPEED = 2;
const EASE = 6;

function gazeTime(look: number) {
  return LOOK_FROM + (LOOK_TO - LOOK_FROM) * Math.min(Math.max(look, 0), 1);
}

function speedAt(t: number) {
  return t > LOOK_TO && t < LEAN_END ? LEAN_SPEED : 1;
}

export function LoginMascot({ pose, look }: { pose: MascotPose; look: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const poseRef = useRef(pose);
  const lookRef = useRef(look);

  useEffect(() => {
    poseRef.current = pose;
    lookRef.current = look;
  }, [pose, look]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let idleTarget = IDLE_TO;
    let pauseUntil = 0;
    let last = performance.now();
    let id = 0;

    const tick = (now: number) => {
      id = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (video.readyState < 2 || video.seeking) return;

      const t = video.currentTime;
      const current = poseRef.current;
      let target: number;
      let rate = speedAt(t);
      if (current === "email") {
        target = gazeTime(lookRef.current);
        rate = Math.min(rate, Math.abs(target - t) * EASE + 0.05);
      } else if (current === "idle") {
        if (reduced.matches) target = IDLE_FROM;
        else if (t > IDLE_TO + 0.01) target = IDLE_TO;
        else {
          if (Math.abs(idleTarget - t) < 0.01) {
            pauseUntil ||= now + IDLE_PAUSE;
            if (now < pauseUntil) return;
            idleTarget = idleTarget === IDLE_TO ? IDLE_FROM : IDLE_TO;
            pauseUntil = 0;
          }
          target = idleTarget;
          rate = IDLE_SPEED;
        }
      } else {
        target = HOLD[current];
      }

      const gap = target - t;
      if (Math.abs(gap) < 0.005) return;
      video.currentTime = reduced.matches ? target : t + Math.sign(gap) * Math.min(Math.abs(gap), rate * dt);
    };

    video.currentTime = IDLE_FROM;
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <video
      ref={ref}
      muted
      playsInline
      disablePictureInPicture
      preload="auto"
      poster="/mascot/fox.webp"
      width={128}
      height={128}
      aria-hidden="true"
      tabIndex={-1}
      className="pointer-events-none mx-auto -mb-[9px] block size-32 shrink-0 rounded-full object-cover ring-4 ring-surface dark:brightness-90"
      data-pose={pose}
    >
      <source src="/mascot/fox.mp4" type="video/mp4" />
      <source src="/mascot/fox.webm" type="video/webm" />
    </video>
  );
}
