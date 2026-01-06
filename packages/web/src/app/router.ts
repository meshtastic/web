import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routes.tsx";

export const router = createRouter({
  routeTree,
  context: undefined!,
});
