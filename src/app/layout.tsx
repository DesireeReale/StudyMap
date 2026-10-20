import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque, IBM_Plex_Mono, Lexend } from "next/font/google";
import { getPreferences } from "@/lib/app-style";
import "./globals.css";

const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], preload: false });
const atkinsonNext = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson-next",
  subsets: ["latin"],
  preload: false,
  adjustFontFallback: false,
});
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400"], preload: false });

export const metadata: Metadata = {
  title: { default: "StudyMap", template: "%s · StudyMap" },
  description: "Trasforma appunti, slide e PDF in mappe concettuali e flashcard.",
  applicationName: "StudyMap",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1520" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [lexend, bricolage, atkinsonNext, plexMono].map((f) => f.variable).join(" ");
  const prefs = await getPreferences();
  return (
    <html
      lang="it"
      data-style={prefs.style}
      data-font={prefs.font}
      data-size={prefs.size}
      data-spacing={prefs.spacing}
      data-paper={prefs.paper}
      data-map-case={prefs.mapCase}
      data-timer-study={prefs.timerStudy}
      data-timer-break={prefs.timerBreak}
      data-timer-long={prefs.timerLong}
      data-timer-sessions={prefs.timerSessions}
      className={`${fonts} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
