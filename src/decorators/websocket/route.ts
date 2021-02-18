import { WebsocketRoute } from "../../server/websocket/routing/route";
import { WebsocketRouter } from "../../server/websocket/routing/router";

export function Route(method: string, baseRoute?: string) {
  return function (target: any, propertyKey?: string): any {
    // initialize routeDfinition
    if (!propertyKey) {
      // class annotation
      if (target.prototype.routeDefinition) {
        target.prototype.routeDefinition.Method = method;
      } else {
        target.prototype.routeDefinition = new WebsocketRoute(method, null);
      }

      if (baseRoute) {
        WebsocketRouter.getRouteByMethod(baseRoute).addChild(
          target.prototype.routeDefinition
        );
      } else {
        WebsocketRouter.registerRoute(target.prototype.routeDefinition);
      }
    } else {
      // method annotation
      if (baseRoute) {
        // overrideBaseRoute
        WebsocketRouter.getRouteByMethod(baseRoute).addChild(
          new WebsocketRoute(method, target[propertyKey])
        );
      } else {
        // add route to class
        if (!target.routeDefinition) {
          target.routeDefinition = new WebsocketRoute("", null);
        }

        target.routeDefinition.Children.push(
          new WebsocketRoute(method, target[propertyKey])
        );
      }
    }
    return target;
  };
}
