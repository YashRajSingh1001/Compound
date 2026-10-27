import type { MetadataRoute } from "next";

// Lets "Add to Home Screen" install Compound as a full-screen app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Compound",
    short_name: "Compound",
    description: "Small daily wins that compound.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0c0a",
    theme_color: "#0d0c0a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
