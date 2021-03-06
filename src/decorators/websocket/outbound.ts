import {
  WebsocketOutbound,
  Outbound as WSOutbound,
} from "../../server/websocket/routing/outbound";
import { registerSubscription } from "./subscription";

export function Outbound(
  method: string,
  requestingRequired?: boolean,
  resendAfterAuthentication?: boolean
) {
  return function _Outbound(target: any, propertyKey: string): any {
    // method annotation
    if (!target.___wsoutbound) target.___wsoutbound = {};
    target.___wsoutbound[propertyKey] = method;
    WebsocketOutbound.addOutbound(
      new WSOutbound(
        method,
        target[propertyKey].bind(target.___data),
        requestingRequired,
        resendAfterAuthentication
      )
    );

    if (
      target.___registerSubscription &&
      target.___registerSubscription[propertyKey]
    ) {
      registerSubscription(target, propertyKey);
    }
    return target;
  };
}
/*
// @todo add dataPool base decorator
export function Pool(cls: any, attrs: any) {
  return class extends cls {
    constructor() {
      throw "hehe i intercepted";
      super();
    }
  };
}
*/
