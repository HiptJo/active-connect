import {
  WebsocketOutboundCacheKeyProvider,
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
export function SupportsCache(provider: WebsocketOutboundCacheKeyProvider) {
  return function _SupportsCache(target: any, propertyKey: string) {
    const config = WebsocketOutboundDecoratorConfig.get(target, propertyKey);
    config.supportsCache = true;
    config.cacheKeyProvider = provider;
  };
}

/**
 * Annotates that the outbound data is cached by clients.
 * This must only be used for database responses and other data, that is fully re-generated.
 * Otherwise the caching does not work, as the reference to the last version is stored - not an copy of the data.
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
export function PartialUpdates(target: any, propertyKey: string) {
  const config = WebsocketOutboundDecoratorConfig.get(target, propertyKey);
  config.partialUpdates = true;
}
