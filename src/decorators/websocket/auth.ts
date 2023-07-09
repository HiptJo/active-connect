import { WebsocketAuthenticator } from "../../server/websocket/auth/authenticator";
import { WebsocketDecoratorConfig } from "./config/websocket-decorator-config";
import { WebsocketOutboundDecoratorConfig } from "./config/websocket-outbound-decorator-config";
import { WebsocketRouteDecoratorConfig } from "./config/websocket-route-decorator-config";

/**
 * @decorator
 * Adds an authenticator to either a websocket route or outbound.
 * The outbound is only sent when the authentication passes. Otherwise, no error message is sent.
 * If a route is secured using this outbound, the function is only called when the authenticator passes.
 * When the authenticator does not pass, an error message (m.error) is sent to the client.
 *
 * @param authenticator - The authenticator to be added.
 *
 * @example Method annotation for outbound:
 * ```
 * class Example {
 *     @Outbound("d.example")
 *     @Auth(new MyAuthenticator())
 *     async getData(connection: WebsocketConnection): Promise<any> {
 *       return [...];
 *     }
 * }
 * ```
 */
export function Auth(authenticator: WebsocketAuthenticator) {
  return function _Auth(target: any, propertyKey: string): any {
    const configs: WebsocketDecoratorConfig[] = [
      WebsocketOutboundDecoratorConfig.get(target, propertyKey),
      WebsocketRouteDecoratorConfig.get(target, propertyKey),
    ];
    for (var config of configs) {
      if (config.authenticator) {
        throw new Error(
          "Error for config " +
            propertyKey +
            ": Can not define authentication as another authenticator is already present."
        );
      }
      config.authenticator = authenticator;
    }
  };
}

/**
 * @decorator
 * Routes decorated with this annotation indicate that the authentication of the user might change during the method call.
 * This annotation triggers the re-sending of all outbounds that the user has received and are decorated using `@ResendAfterAuthenticationChange`.
 *
 * @example Method annotation:
 * ```
 * @Route("auth")
 * class Auth {
 *     @Route("login")
 *     @ModifiesAuthentication
 *     async login(credentials: any, connection: WebsocketConnection): Promise<any> {
 *        [...]
 *     }
 * }
 * ```
 */
export function ModifiesAuthentication(target: any, propertyKey: string): any {
  const config = WebsocketRouteDecoratorConfig.get(target, propertyKey);
  config.modifiesAuthentication = true;
}

/**
 * @decorator
 * Outbounds decorated with this decorator are re-sent to the client once the client's authentication changes.
 * The authentication change is detected when a method decorated with `@ModifiesAuthentication` is called by the client.
 *
 * @example
 * // Method annotation:
 * class Example {
 *     @Outbound("auth.user")
 *     @ResendAfterAuthenticationChange
 *     async getUser(connection: WebsocketConnection): Promise<User> {
 *       return [...];
 *     }
 * }
 */
export function ResendAfterAuthenticationChange(
  target: any,
  propertyKey: string
): any {
  const config = WebsocketOutboundDecoratorConfig.get(target, propertyKey);
  config.resendAfterAuthenticationChange = true;
}
