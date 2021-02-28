import { WebsocketRequest } from "../message/request";
import { StandaloneWebsocketRoute, WebsocketRoute } from "./route";

export class WebsocketRouter {
  private static routes: Array<WebsocketRoute> = [];
  private static standaloneRoutes: Array<StandaloneWebsocketRoute> = [];

  public static registerStandaloneRoute(route: WebsocketRoute) {
    WebsocketRouter.standaloneRoutes.push(route);
  }
  public static registerRoute(route: StandaloneWebsocketRoute) {
    WebsocketRouter.routes.push(route);
  }
  public static get Routes(): Array<WebsocketRoute> {
    return WebsocketRouter.routes;
  }
  public static get StandaloneRoutes(): Array<StandaloneWebsocketRoute> {
    return WebsocketRouter.standaloneRoutes;
  }
  public static getRouteByMethod(method: string): WebsocketRoute {
    // check for standalone method
    const standalone = WebsocketRouter.standaloneRoutes.filter(
      (r) => r.Method == method
    );
    if (standalone.length > 0) {
      return standalone[0];
    }

    // check for other methods
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
    // check for standalone methods
    // check for standalone method
    const standalone = WebsocketRouter.standaloneRoutes.filter(
      (r) => request.path.indexOf(r.Method) == 0
    );
    if (standalone.length > 0) {
      if (await standalone[0].route(request, [request.path])) {
        return true;
      }
    }

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
