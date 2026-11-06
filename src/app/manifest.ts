import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Velox Skate POS",
    short_name: "Velox",
    description: "Internal operations, timer tracking, equipment inventory, and POS financial accounting for skate operations.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7F6F3",
    theme_color: "#29221E",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/logo.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/logo.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
