import {
  WebsocketOutbounds,
  WebsocketOutbound as WSOutbound,
} from "../../server/websocket/routing/outbound";
import { WebsocketOutboundDecoratorConfig } from "./config/websocket-outbound-decorator-config";

/**
 * @decorator
 * Outbound decorator for WebSocket outbound messages.
 * This annotation can be used for methods only.
 *
 * Supported Decorators:
 * - `@Auth`
 * - `@Subscribe` and `@SubscribeFor`
 * - `@ResendAfterAuthenticationChange`
 *
 * @param method - The method name for the outbound message.
 *                 Outbound method names do not append to route methods.
 * @param [lazyLoading] - Indicates if the outbound message should be lazily loaded by clients.
 * @param [resendAfterAuthenticationChange] - Indicates if the outbound message should be resent after authentication changes.
 * @returns - The decorator function.
 *
 * @example Method annotation:
 * ```
 * class Example {
 *     @Outbound("d.example")
 *     async getData(connection: WebsocketConnection): Promise<any> {
 *       return [...];
 *     }
 * }
 * ```
 */
export function Outbound(
  method: string,
  lazyLoading?: boolean,
  resendAfterAuthenticationChange?: boolean
) {
  return function _Outbound(target: any, propertyKey: string): any {
    // method annotation
    const config = WebsocketOutboundDecoratorConfig.get(target, propertyKey);
    config.lazyLoading = lazyLoading || false;
    config.resendAfterAuthenticationChange =
      resendAfterAuthenticationChange || false;

    WebsocketOutbounds.addOutbound(
      new WSOutbound(
        method,
        target[propertyKey].bind(target.___data)
      ).bindDecoratorConfig(config)
    );

    return target;
  };
}
