import {
  WebsocketOutbound,
  Outbound as WSOutbound,
} from "../../server/websocket/routing/outbound";
import { registerSubscription } from "./subscription";

export function Outbound(method: string, requestingRequired?: boolean) {
  return function (target: any, propertyKey: string): any {
    // method annotation
    if (!target.___wsoutbound) target.___wsoutbound = [];
    target.___wsoutbound[propertyKey] = method;
    WebsocketOutbound.addOutbound(
      new WSOutbound(method, target[propertyKey], requestingRequired)
    );

    if (
      target.___registerSubscription &&
      target.___registerSubscription[propertyKey]
    ) {
      registerSubscription(target, propertyKey);
    }
  };
}
