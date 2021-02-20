import { WebsocketRoute } from "../../server/websocket/routing/route";
import { StandaloneWebsocketRoute } from "../../server/websocket/routing/route-standalone";
import { WebsocketRouter } from "../../server/websocket/routing/router";

export function Route(method: string, baseRoute?: string) {
  return function (target: any, propertyKey?: string): any {
    // initialize routeDfinition
    if (!propertyKey) {
      // class annotation
      const route = new WebsocketRoute(method, null);

      if (target.prototype.___routeDefinition) {
        // initialize children
        target.prototype.___routeDefinition.forEach(
          (child: { method: string; propertyKey: string }) => {
            route.addChild(
              new WebsocketRoute(
                child.method,
                target.prototype[child.propertyKey]
              )
            );
          }
        );
      }

      if (baseRoute) {
        WebsocketRouter.getRouteByMethod(baseRoute).addChild(route);
      } else {
        WebsocketRouter.registerRoute(route);
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
        if (!target.___routeDefinition) {
          target.___routeDefinition = [];
        }
        target.___routeDefinition.push({ method, propertyKey });
      }
    }
    return target;
  };
}

export function StandaloneRoute(method: string) {
  return function (target: any, propertyKey: string): any {
    // method annotation
    // register standalone route
    WebsocketRouter.registerStandaloneRoute(
      new StandaloneWebsocketRoute(method, target[propertyKey])
    );
  };
}
