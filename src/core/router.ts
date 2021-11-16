import { createRouter, defineRoute } from 'type-route';

export const { RouteProvider, useRoute, routes } = createRouter({
  messages: defineRoute('/'),
  nodes: defineRoute('/nodes'),
  plugins: defineRoute('/plugins'),
  settings: defineRoute('/settings'),
});
