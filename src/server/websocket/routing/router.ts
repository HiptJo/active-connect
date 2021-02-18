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

  public route(request: WebsocketRequest) {
    for (const child of WebsocketRouter.routes) {
      if (child.route(request, request.path.split("."))) {
        return true;
      }
    }
    return false;
  }
}
