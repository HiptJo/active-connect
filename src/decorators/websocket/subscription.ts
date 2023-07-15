import { MessageFilter } from "../../server";
import { WebsocketOutboundDecoratorConfig } from "../config/websocket-outbound-decorator-config";
import { WebsocketRouteDecoratorConfig } from "../config/websocket-route-decorator-config";

/**
 * Creates a subscription for outbounds.
 * All clients that receive the outbound data will be subscribed.
 * Once the data is modified (route function decorated using @Modifies or @ModifiesMatching has been called), the outbound is re-sent to the clients.
 *
 * @example Method annotation for outbound:
 * ```
 * class Example {
 *     @Outbound("d.example")
 *     @Subscribe
 *     async getData(connection: WebsocketConnection): Promise<any> {
 *       return [...];
 *     }
 * }
 * ```
 */
export function Subscribe(target: any, propertyKey: string) {
  const config = WebsocketOutboundDecoratorConfig.get(target, propertyKey);
  config.enableSubscription();
}
/**
 * @deprecated
 */
export function SubscribeChanges(target: any, propertyKey: string) {
  return Subscribe(target, propertyKey);
}

/**
 * Creates a subscription for outbounds using a filter.
 * All clients that receive the outbound data will be subscribed.
 * Once the data is modified (route function decorated using @Modifies or @ModifiesMatching with matching `MessageFilter` has been called), the outbound is re-sent to the clients.
 *
 * @param filter - The filter to be used for subscription.
 *
 * @example Method annotation for outbound:
 * ```
 * class Example {
 *     @Outbound("d.example")
 *     @SubscribeFor(new MyMessageFilter())
 *     async getData(connection: WebsocketConnection): Promise<any> {
 *       return [...];
 *     }
 * }
 * ```
 */
export function SubscribeFor(filter: MessageFilter) {
  return function _SubscribeFor(target: any, propertyKey: string) {
    const config = WebsocketOutboundDecoratorConfig.get(target, propertyKey);
    config.addSubscriptionFor(filter);
  };
}
/**
 * @deprecated
 */
export function SubscribeMatchingChanges(filter: MessageFilter) {
  return SubscribeFor(filter);
}

/**
 * Once routes decorated with this decorator have been called, the provided outbound routes will be re-sent to all regular subscriptions and filtered subscriptions.
 *
 * @param routes - The outbound methods that are modified and should be re-sent.
 *
 * @example Method annotation:
 * ```
 * @Route("example")
 * class Example {
 *
 *     @Outbound("d.data")
 *     @Subscribe
 *     async getData(connection: WebsocketConnection): Promise<any> {
 *       return [...];
 *     }
 *
 *     @Route("save")
 *     @Modifies("d.data")
 *     async save(data: any, connection: WebsocketConnection): Promise<any> {
 *        [...]
 *        // outbound `d.data` is re-sent to all subscribed clients once this method has been executed successfully
 *     }
 * }
 * ```
 */
export function Modifies(...routes: string[]) {
  return function _Modifies(target: any, propertyKey: string) {
    const config = WebsocketRouteDecoratorConfig.get(target, propertyKey);
    config.addModifies(...routes);
  };
}
/**
 * Once routes decorated with this decorator have been called, the provided outbound routes will be re-sent to all regular subscriptions and filtered subscriptions matching the filter.
 *
 * @param filter - The filter to be used for matching the clients (e.g., for updating data for only one mandatory, ...).
 * @param routes - The outbound methods that are modified and should be re-sent.
 *
 * @example Method annotation:
 * ```
 * @Route("example")
 * class Example {
 *
 *     @Outbound("d.data")
 *     @SubscribeFor(new MyMessageFilter())
 *     async getData(connection: WebsocketConnection): Promise<any> {
 *       return [...];
 *     }
 *
 *     @Route("save")
 *     @ModifiesFor(new MyMessageFilter(), "d.data")
 *     async save(data: any, connection: WebsocketConnection): Promise<any> {
 *        [...]
 *        // outbound `d.data` is re-sent to all subscribed clients once this method has been executed successfully
 *     }
 * }
 * ```
 */
export function ModifiesFor(filter: MessageFilter, ...routes: string[]) {
  return function _ModifiesFor(target: any, propertyKey: string) {
    const config = WebsocketRouteDecoratorConfig.get(target, propertyKey);
    config.addModifiesFor(filter, ...routes);
  };
}
/**
 * @deprecated
 */
export function ModifiesMatching(filter: MessageFilter, ...routes: string[]) {
  return ModifiesFor(filter, ...routes);
}
