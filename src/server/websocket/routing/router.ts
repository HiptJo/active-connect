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
    const standalone = WebsocketRouter.standaloneRoutes.filter(
      (r) => method == r.Method
    );
    if (standalone.length > 0) {
      return standalone[0];
    }

    var routes = WebsocketRouter.routes;
    var selectedRoute: WebsocketRoute = null;
    var parts = method.split(".");
    parts.forEach((part) => {
      var res = routes.filter((r) => r.Method == part);
      if (res.length > 0) {
        selectedRoute = res[0];
        routes = selectedRoute.Children;
      } else {
        throw Error(
          `Websocket Routing: Could not find route by method "${method}"`
        );
      }
    });
    return selectedRoute;
  }

  public async route(request: WebsocketRequest) {
    const route = WebsocketRouter.getRouteByMethod(request.method);
    return await route.route(request, [route.Method]);
  }
}
