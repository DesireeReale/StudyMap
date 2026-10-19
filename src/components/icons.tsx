import type { SVGProps } from "react";

const paths = {
  library: "M4 5.5A1.5 1.5 0 0 1 5.5 4H9v16H5.5A1.5 1.5 0 0 1 4 18.5zM9 4h3.5A1.5 1.5 0 0 1 14 5.5V20H9zM14.5 6.2l3-.8a1.2 1.2 0 0 1 1.5.9l2.6 11.9a1.2 1.2 0 0 1-.9 1.4l-3 .8",
  upload: "M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  logout: "M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 16l-4-4 4-4M6 12h10",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  back: "M15 18l-6-6 6-6",
  plus: "M12 5v14M5 12h14",
  file: "M14 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V7zM14 3v4h4",
  map: "M12 7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 20.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 20.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM11 7.2 6.8 16.7M13 7.2l4.2 9.5",
  cards: "M8 6h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 16V5a1 1 0 0 1 1-1h11",
  trash: "M4 7h16M9 7V4.5h6V7M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7",
  download: "M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M5 19h14",
  layout: "M4 5h6v6H4zM14 13h6v6h-6zM10 8h4v8",
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 18, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M16 10.5 9.5 21M16 10.5 16 22M16 10.5 22.5 21" stroke="var(--sheet)" strokeWidth="1.8" />
      <circle cx="16" cy="10" r="3.6" fill="var(--sheet)" />
      <circle cx="9.5" cy="22" r="2.6" fill="var(--sheet)" />
      <circle cx="16" cy="23" r="2.6" fill="var(--sheet)" />
      <circle cx="22.5" cy="22" r="2.6" fill="var(--sheet)" />
    </svg>
  );
}
