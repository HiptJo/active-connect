import { MessageFilter } from "../../server";
import { WebsocketOutboundDecoratorConfig } from "./config/websocket-outbound-decorator-config";
import { WebsocketRouteDecoratorConfig } from "./config/websocket-route-decorator-config";

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

export function Modifies(...routes: string[]) {
  return function _Modifies(target: any, propertyKey: string) {
    const config = WebsocketRouteDecoratorConfig.get(target, propertyKey);
    config.addModifies(...routes);
  };
}
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
