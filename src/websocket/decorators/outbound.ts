import { DecorableFunction } from "../../decorator-config";
import {
  WebsocketOutbound,
  WebsocketOutbounds,
} from "../server/routing/outbound";
import { WebsocketOutboundDecoratorConfig } from "./websocket-outbound-decorator-config";

/**
 * Outbound decorator for WebSocket outbound messages.
 * This annotation can be used for methods only.
 *
 * Supported Decorators:
 * - `@Auth`
 * - `@Subscribe` and `@SubscribeFor`
 * - `@ResendAfterAuthenticationChange`
 * - `@LazyLoading`
 * - `@SupportsCache`
 * - `@PartialUpdates`
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
    if (lazyLoading) config.lazyLoading = lazyLoading;
    if (resendAfterAuthenticationChange)
      config.resendAfterAuthenticationChange = resendAfterAuthenticationChange;

    WebsocketOutbounds.addOutbound(
      new WebsocketOutbound(
        method,
        {
          target,
          propertyKey,
        },
        lazyLoading || false,
        resendAfterAuthenticationChange || false
      ).bindDecoratorConfig(config)
    );

    return target;
  };
}

/**
 * Annotates that the outbound should be lazy-loaded by clients.
 *
 * @example Method annotation for outbound:
 * ```
 * class Example {
 *     @Outbound("d.example")
 *     @LazyLoading
 *     async getData(connection: WebsocketConnection): Promise<any> {
 *       return [...];
 *     }
 * }
 * ```
 */
export function LazyLoading(target: any, propertyKey: string) {
  const config = WebsocketOutboundDecoratorConfig.get(target, propertyKey);
  config.lazyLoading = true;
}

/**
 * Annotates that the outbound data is cached by clients.
 *
 * @example Method annotation for outbound:
 * ```
 * class Example {
 *     @Outbound("d.example")
 *     @SupportsCache
 *     async getData(connection: WebsocketConnection): Promise<any> {
 *       return [...];
 *     }
 * }
 * ```
 */
export function SupportsCache(target: any, propertyKey: string) {
  const config = WebsocketOutboundDecoratorConfig.get(target, propertyKey);
  config.supportsCache = true;
}

/**
 * Annotates that only changes of the outbound data should be sent to the client.
 * This reduces the amount of data, that is sent via the WebSocket connection.
 * However the calculation of the difference is executed on the server-side.
 *
 * @example Method annotation for outbound:
 * ```
 * class Example {
 *     @Outbound("d.example")
 *     @PartialUpdates
 *     async getData(connection: WebsocketConnection): Promise<any> {
 *       return [...];
 *     }
 * }
 * ```
 */
export function PartialUpdates(target: any, propertyKey: string) {
  const config = WebsocketOutboundDecoratorConfig.get(target, propertyKey);
  config.partialUpdates = true;
}

export function ForId(method: string) {
  return function _ForId(target: any, propertyKey: string): any {
    // method annotation
    WebsocketOutbounds.addForIdConfig(
      method,
      new DecorableFunction({ target, propertyKey })
    );
    return target;
  };
}

export function ForGroup(method: string) {
  return function _ForGroup(target: any, propertyKey: string): any {
    // method annotation
    WebsocketOutbounds.addForGroupConfig(
      method,
      new DecorableFunction({ target, propertyKey })
    );
    return target;
  };
}
