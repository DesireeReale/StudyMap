import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: { default: "StudyMap", template: "%s · StudyMap" },
  description: "Trasforma appunti, slide e PDF in mappe concettuali e flashcard.",
  applicationName: "StudyMap",
};

export const viewport: Viewport = {
  themeColor: "#0f5f5c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${atkinson.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
