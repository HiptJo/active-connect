import { WebsocketRequest } from "../message/request";
import { WebsocketRoute } from "./route";

export class WebsocketRouter {
  private static routes: Array<WebsocketRoute> = [];

  public registerRoute(route: WebsocketRoute) {
    WebsocketRouter.routes.push(route);
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
