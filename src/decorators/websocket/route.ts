import {
  StandaloneWebsocketRoute,
  WebsocketRoute,
} from "../../server/websocket/routing/route";
import { WebsocketRouter } from "../../server/websocket/routing/router";
import { WebsocketRouteDecoratorConfig } from "./config/websocket-route-decorator-config";

export function Route(
  method: string,
  baseRoute?: string,
  modifiesAuthentication?: boolean
) {
  return function _Route(target: any, propertyKey?: string): any {
    const config = WebsocketRouteDecoratorConfig.get(target, propertyKey);

    // initialize routeDfinition
    if (!propertyKey) {
      // class annotation
      if (modifiesAuthentication) {
        throw Error(
          "Modifies-Authentication mode is not support for class annotation"
        );
      }

      const route = new WebsocketRoute(method, null);
      for (const child of target.prototype.___route.children) {
        route.addChild(child);
      }

      // register
      if (baseRoute) {
        WebsocketRouter.getRouteByMethod(baseRoute).addChild(route);
      } else {
        WebsocketRouter.registerRoute(route);
      }
    } else {
      // method annotation
      if (baseRoute) {
        throw Error("Base-Route is not supported for method annotations");
      }

      config.modifiesAuthentication = modifiesAuthentication || false;

      const route = new WebsocketRoute(method, {
        target,
        propertyKey,
      }).bindDecoratorConfig(
        WebsocketRouteDecoratorConfig.get(target, propertyKey)
      );
      target.prototype.___route.children.push(route);
    }
  };
}

export function StandaloneRoute(
  method: string,
  modifiesAuthentication?: boolean
) {
  return function _StandaloneRoute(target: any, propertyKey: string): any {
    // method annotation
    WebsocketRouteDecoratorConfig.init(target, propertyKey);

    // register standalone route
    WebsocketRouter.registerStandaloneRoute(
      new StandaloneWebsocketRoute(
        method,
        target[propertyKey].bind(target.___data),
        modifiesAuthentication
      ).bindDecoratorConfig(target.prototype.___route.config[propertyKey])
    );
  };
}
