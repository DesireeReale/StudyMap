"use client";

import { useEffect, useRef } from "react";

export type MascotPose = "idle" | "email" | "password" | "peek";

const IDLE_END = 4;
const HOLD = { peek: 6.5, password: 7.5 };
const LOOK_LEFT = [2.42, 1.8];
const LOOK_RIGHT = [3.0, 3.6];
const LOOK_SPLIT = 0.6;

function gazeTime(look: number) {
  const k = Math.min(Math.max(look, 0), 1);
  return k < LOOK_SPLIT
    ? LOOK_LEFT[0] + (LOOK_LEFT[1] - LOOK_LEFT[0]) * (k / LOOK_SPLIT)
    : LOOK_RIGHT[0] + (LOOK_RIGHT[1] - LOOK_RIGHT[0]) * ((k - LOOK_SPLIT) / (1 - LOOK_SPLIT));
}

function seek(video: HTMLVideoElement, target: number, done?: () => void) {
  const from = video.currentTime;
  const ms = Math.max(Math.min(Math.abs(target - from), 0.8) * 1000, 1);
  const start = performance.now();
  let id = 0;
  const step = (now: number) => {
    const k = Math.min((now - start) / ms, 1);
    if (!video.seeking) {
      video.currentTime = from + (target - from) * k;
      if (k === 1) return done?.();
    }
    id = requestAnimationFrame(step);
  };
  id = requestAnimationFrame(step);
  return () => cancelAnimationFrame(id);
}

export function LoginMascot({ pose, look }: { pose: MascotPose; look: number }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.pause();
    if (pose === "email") {
      video.currentTime = gazeTime(look);
      return;
    }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.currentTime = pose === "idle" ? 0 : HOLD[pose];
      return;
    }
    if (pose !== "idle") return seek(video, HOLD[pose]);

    const rewind = () => {
      if (video.currentTime >= IDLE_END) video.currentTime = 0;
    };
    const loop = () => {
      video.addEventListener("timeupdate", rewind);
      video.play().catch(() => {});
    };
    const stop = video.currentTime > IDLE_END ? seek(video, 0, loop) : (loop(), undefined);
    return () => {
      stop?.();
      video.removeEventListener("timeupdate", rewind);
    };
  }, [pose, look]);

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
