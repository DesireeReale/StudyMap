"use client";

import { useEffect, useRef } from "react";

export type MascotPose = "idle" | "email" | "password" | "peek";

const IDLE_END = 4;
const HOLD = { email: 5, peek: 6.5, password: 7.5 };

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

export function LoginMascot({ pose }: { pose: MascotPose }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.pause();
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
  }, [pose]);

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
      className="pointer-events-none mx-auto -mb-[9px] block size-32 shrink-0 rounded-full object-cover"
      data-pose={pose}
    >
      <source src="/mascot/fox.mp4" type="video/mp4" />
      <source src="/mascot/fox.webm" type="video/webm" />
    </video>
  );
}
