import { WebsocketRequest } from "../message/request";
import { StandaloneWebsocketRoute, WebsocketRoute } from "./route";

/**
 * WebsocketRouter class handles routing for websocket requests.
 */
export class WebsocketRouter {
  private static routes: Array<WebsocketRoute> = [];
  private static standaloneRoutes: Array<StandaloneWebsocketRoute> = [];

  /**
   * Register a standalone route.
   * @param route - The standalone websocket route to register.
   */
  public static registerStandaloneRoute(route: StandaloneWebsocketRoute) {
    let error = false;
    try {
      error = WebsocketRouter.getRouteByMethod(route.Method) ? true : false;
    } catch {
      // expect to get an error here, as the route must not exist before it is registered
    }
    if (error) {
      throw Error(
        "ActiveConnect: Two routes have been registered using the same method (" +
          route.Method +
          ")"
      );
    }
    WebsocketRouter.standaloneRoutes.push(route);
  }

  /**
   * Register a route.
   * @param route - The websocket route to register.
   */
  public static registerRoute(route: WebsocketRoute) {
    route.checkForDuplicates();
    WebsocketRouter.routes.push(route);
  }

  /**
   * Removes a WebSocket route if it exists.
   * @param method - The method name of the route to remove.
   */
  public static removeRouteIfExists(method: string) {
    WebsocketRouter.standaloneRoutes = WebsocketRouter.standaloneRoutes.filter(
      (r) => method != r.Method
    );

    var routes = WebsocketRouter.routes;
    var selectedRoute: WebsocketRoute = null;
    var parent: WebsocketRoute | null = null;
    var parts = method.split(".");
    parts.forEach((part) => {
      parent = selectedRoute;
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
    if (parent && selectedRoute) {
      parent.Children.splice(parent.Children.indexOf(selectedRoute));
    }
  }

  /**
   * Get all registered routes.
   * @returns - An array of websocket routes.
   */
  public static get Routes(): Array<WebsocketRoute> {
    return WebsocketRouter.routes;
  }

  /**
   * Get all registered standalone routes.
   * @returns - An array of standalone websocket routes.
   */
  public static get StandaloneRoutes(): Array<StandaloneWebsocketRoute> {
    return WebsocketRouter.standaloneRoutes;
  }

  /**
   * Get a route by its method.
   * @param method - The method to search for.
   * @returns - The matching websocket route.
   * @throws {Error} - If no route is found with the given method.
   */
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

  /**
   * Route a websocket request.
   * @param request - The websocket request to route.
   * @returns - A promise that resolves with the routed response.
   */
  public async route(request: WebsocketRequest): Promise<any> {
    const route = WebsocketRouter.getRouteByMethod(request.method);
    return await route.route(request, [route.Method]);
  }

  /**
   * Loads the decorator configuration for all WebSocket routes.
   * Iterates through each route and invokes the `loadDecoratorConfig` method to load the configuration.
   */
  public static loadDecoratorConfig() {
    for (var route of WebsocketRouter.routes) {
      route.loadDecoratorConfig();
    }
    for (var route of WebsocketRouter.standaloneRoutes) {
      route.loadDecoratorConfig();
    }
  }
}
