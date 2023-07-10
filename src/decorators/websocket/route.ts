import {
  StandaloneWebsocketRoute,
  WebsocketRoute,
} from "../../server/websocket/routing/route";
import { WebsocketRouter } from "../../server/websocket/routing/router";
import { WebsocketRouteDecoratorConfig } from "./config/websocket-route-decorator-config";

/**
 * @decorator
 * Route decorator for WebSocket routes.
 * Can be used to register WebSocket routes.
 * This annotation can be used for methods and classes.
 *
 * Supported Decorators:
 * - `@Auth`
 * - `@Modifies` and `@ModifiesFor`
 * - `@ModifiesAuthentication`
 *
 * @param method - The HTTP method for the route.
 * @param [baseRoute] - The base route path for the route.
 * @param [modifiesAuthentication] - Indicates if the route modifies authentication.
 *                                   If true all Websocket Outbounds with tag will be re-sent automatically.
 * @returns - The decorator function.
 *
 * @example Preparations for a simple login route:
 * This method can be called by sending a message using method `auth.login`.
 * The response (return value of the method) is sent to the client using `m.auth.login`.
 * ```
 * @Route("auth")
 * class Auth {
 *     @Route("login")
 *     async login(credentials: any, connection: WebsocketConnection): Promise<any> {
 *       // check authentication for provided credentials.
 *       if (authenticated)
 *          return true;
 *       else
 *          return false;
 *     }
 * }
 * ```
 */
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
      target.prototype.___route.base = route;
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

      config.modifiesAuthentication ||= modifiesAuthentication;

      const route = new WebsocketRoute(method, {
        target,
        propertyKey,
      }).bindDecoratorConfig(
        WebsocketRouteDecoratorConfig.get(target, propertyKey)
      );
      target.___route.children.push(route);
      if (target.___route.base) {
        target.___route.base.addChild(route);
      }
    }
  };
}

/**
 * @decorator
 * StandaloneRoute decorator for WebSocket routes.
 * Can be used to register Standalone WebSocket routes.
 * This annotation can be used for methods only.
 *
 * Supported Decorators:
 * - `@Auth`
 * - `@Modifies` and `@ModifiesFor`
 * - `@ModifiesAuthentication`
 *
 * @param method - The HTTP method for the route.
 * @param [modifiesAuthentication] - Indicates if the route modifies authentication.
 *                                   If true all Websocket Outbounds with tag will be re-sent automatically.
 * @returns - The decorator function.
 *
 * @example Preparations for a simple standalone message route:
 * This method can be called by sending a message using method `example.insert`.
 * The response (return value of the method, ex: insertId) is sent to the client using `m.example.insert`.
 * ```
 * class Example {
 *     @StandaloneRoute("example.insert")
 *     async insert(data: any, connection: WebsocketConnection): Promise<any> {
 *       // process data
 *       return insertId;
 *     }
 * }
 * ```
 */
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
        { target, propertyKey },
        modifiesAuthentication
      ).bindDecoratorConfig(
        WebsocketRouteDecoratorConfig.get(target, propertyKey)
      )
    );
  };
}
