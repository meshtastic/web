import { createRouter, defineRoute } from 'type-route';

export const { RouteProvider, useRoute, routes } = createRouter({
  messages: defineRoute('/'),
  nodes: defineRoute('/nodes'),
  settings: defineRoute('/settings'),
  about: defineRoute('/about'),
});
