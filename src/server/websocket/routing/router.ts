import { WebsocketRequest } from "../message/request";
import { WebsocketRoute } from "./route";

export class WebsocketRouter {
  private routes: Array<WebsocketRoute> = [];

  public registerRoute(route: WebsocketRoute) {
    this.routes.push(route);
  }

  public route(request: WebsocketRequest) {
    for (const child of this.routes) {
      if (child.route(request, request.path.split("."))) {
        return true;
      }
    }
    return false;
  }
}
