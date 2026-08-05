import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 포트 규칙: Vite는 프로젝트별 10단위 블록 — bookie 517x(5173 web, 5174 console) — docs/LOCALSTACK.md
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
});