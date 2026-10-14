import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import handler from "./api/brief.js";
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [
      react(),
      {
        name: "local-api",
        configureServer(server) {
          server.middlewares.use("/api/brief", async (req, res) => {
            let body = "";
            for await (const chunk of req) {
              body += chunk;
              if (body.length > 20000) {
                res.statusCode = 413;
                res.end(JSON.stringify({ error: "Notes are too large." }));
                return;
              }
            }
            req.body = body;
            res.status = (code) => {
              res.statusCode = code;
              return res;
            };
            res.json = (data) => {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(data));
            };
            await handler(req, res);
          });
        },
      },
    ],
    test: {
      environment: "jsdom",
      setupFiles: ["./tests/setup.js"],
      include: ["tests/**/*.test.{js,jsx}"],
      coverage: {
        provider: "v8",
        reporter: ["text", "json-summary", "html"],
        include: ["src/**/*.{js,jsx}", "api/**/*.js"],
        exclude: ["src/main.jsx"],
        thresholds: { lines: 50, functions: 50, statements: 50, branches: 50 },
      },
    },
  };
});
