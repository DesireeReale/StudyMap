import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StudyMap",
    short_name: "StudyMap",
    description: "Mappe concettuali e flashcard dai tuoi materiali di studio.",
    start_url: "/library",
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: "#0f5f5c",
    lang: "it",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
