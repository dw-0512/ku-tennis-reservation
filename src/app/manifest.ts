import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KUTC",
    short_name: "KUTC",
    description: "고려대학교 테니스부 코트 예약 웹사이트",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F8F8F8",
    theme_color: "#8B0029",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}