import { createRouter, defineRoute } from 'type-route';

export const { RouteProvider, useRoute, routes } = createRouter({
  messages: defineRoute('/'),
  map: defineRoute('/map'),
  extensions: defineRoute('/extensions'),
});
