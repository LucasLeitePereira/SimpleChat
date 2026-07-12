import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "log-ip-entrada-site",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (
            req.method === "GET" &&
            (req.url === "/" || req.url?.startsWith("/index.html"))
          ) {
            const ipBruto =
              req.headers["x-forwarded-for"] ||
              req.socket.remoteAddress ||
              "IP-desconhecido";
            const ip = Array.isArray(ipBruto)
              ? ipBruto[0]
              : String(ipBruto).split(",")[0].trim();
            const ipNormalizado = ip.startsWith("::ffff:")
              ? ip.replace("::ffff:", "")
              : ip;
            console.warn(
              `[AVISO FRONT] Acesso ao site de IP: ${ipNormalizado}`,
            );
          }

          next();
        });
      },
    },
  ],
});
