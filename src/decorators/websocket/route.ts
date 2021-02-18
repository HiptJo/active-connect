import { WebsocketRoute } from "../../server/websocket/routing/route";
import { WebsocketRouter } from "../../server/websocket/routing/router";

export function Route(method: string) {
  return function (...args: Array<any>) {
    if (args.length == 1) {
      const route = new WebsocketRoute(method, null);
      WebsocketRouter.registerRoute(route);
      return class extends args[0] {
        routeDefinition: WebsocketRoute = route;
      };
    } else {
      throw "@Route() for function is not defined";
    }
  };
}
