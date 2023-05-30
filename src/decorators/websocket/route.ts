import {
  StandaloneWebsocketRoute,
  WebsocketRoute,
} from "../../server/websocket/routing/route";
import { WebsocketRouter } from "../../server/websocket/routing/router";

export function Route(
  method: string,
  baseRoute?: string,
  modifiesAuthentication?: boolean
) {
  return function _Route(target: any, propertyKey?: string): any {
    // initialize routeDfinition
    if (!propertyKey) {
      // class annotation
      const route = new WebsocketRoute(method, null);

      if (target.prototype.___routeDefinition) {
        // initialize children
        target.prototype.___routeDefinition.forEach(
          function _registerChild(child: {
            method: string;
            propertyKey: string;
            modifiesAuthentication: boolean;
          }) {
            route.addChild(
              new WebsocketRoute(
                child.method,
                {
                  target,
                  propertyKey,
                },
                child.modifiesAuthentication
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
          new WebsocketRoute(method, { target, propertyKey })
        );
      } else {
        // add route to class
        if (!target.___routeDefinition) {
          target.___routeDefinition = [];
        }
        target.___routeDefinition.push({
          method: method,
          propertyKey: propertyKey,
          modifiesAuthentication: modifiesAuthentication,
        });
      }
    }
    return target;
  };
}

export function StandaloneRoute(
  method: string,
  modifiesAuthentication?: boolean
) {
  return function _StandaloneRoute(target: any, propertyKey: string): any {
    // method annotation
    // register standalone route
    WebsocketRouter.registerStandaloneRoute(
      new StandaloneWebsocketRoute(
        method,
        target[propertyKey].bind(target.___data),
        modifiesAuthentication
      )
    );
    return target;
  };
}
