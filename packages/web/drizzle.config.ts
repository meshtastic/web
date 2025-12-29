import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/data/schema.ts",
  out: "./src/data/migrations",
  dialect: "sqlite",
  driver: "expo",
});
