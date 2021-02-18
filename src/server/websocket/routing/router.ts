import { WebsocketRequest } from "../message/request";
import { WebsocketRoute } from "./route";

export class WebsocketRouter {
  private static routes: Array<WebsocketRoute> = [];

  public static registerRoute(route: WebsocketRoute) {
    WebsocketRouter.routes.push(route);
  }
  public static get Routes(): Array<WebsocketRoute> {
    return WebsocketRouter.routes;
  }
  public static getRouteByMethod(method: string): WebsocketRoute {
    const parts = method.split(".");
    let route: WebsocketRoute;
    for (const part of parts) {
      if (!route) {
        const routes = WebsocketRouter.routes.filter((r) => r.Method == part);
        if (routes.length > 0) {
          route = routes[0];
        } else
          throw Error(
            `Websocket Routing: Could not find route by method ${method}`
          );
      } else {
        const routes = route.Children.filter((r) => r.Method == part);
        if (routes.length > 0) {
          route = routes[0];
        } else
          throw Error(
            `Websocket Routing: Could not find route by method ${method}`
          );
      }
    }
    return route;
  }

  public async route(request: WebsocketRequest) {
    for (const child of WebsocketRouter.routes) {
      if (await child.route(request, request.path.split("."))) {
        return true;
      }
    }
    throw Error(
      `Websocket Routing: Could not find route by method ${request.path}`
    );
  }
}
