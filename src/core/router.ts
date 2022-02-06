import { createRouter, defineRoute } from 'type-route';

export const { RouteProvider, useRoute, routes } = createRouter({
  messages: defineRoute('/'),
  map: defineRoute('/map'),
  nodes: defineRoute('/nodes'),
  extensions: defineRoute('/extensions'),
});
