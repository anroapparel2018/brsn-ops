import type { MetadataRoute } from "next";

// Rend l'app installable sur l'écran d'accueil (PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BRSN OPS",
    short_name: "BRSN OPS",
    description: "Les agents de Julien Brisson, au même endroit.",
    lang: "fr-CA",
    start_url: "/",
    display: "standalone",
    background_color: "#141414",
    theme_color: "#141414",
    icons: [
      { src: "/icones/192", sizes: "192x192", type: "image/png" },
      { src: "/icones/512", sizes: "512x512", type: "image/png" },
      { src: "/icones/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
