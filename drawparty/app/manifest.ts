import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DrawParty",
    short_name: "DrawParty",
    description: "Multiplayer drawing games for you and your friends",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d14",
    theme_color: "#0d0d14",
    orientation: "any",
    icons: [
      {
        src: "/icons/icon-180x180.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
