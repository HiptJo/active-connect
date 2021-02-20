import {
  WebsocketOutbound,
  Outbound as WSOutbound,
} from "../../server/websocket/routing/outbound";

export function Outbound(method: string, requestingRequired?: boolean) {
  return function (target: any, propertyKey: string): any {
    // method annotation
    target.___wsoutbound[propertyKey] = method;
    WebsocketOutbound.addOutbound(
      new WSOutbound(method, target[propertyKey], requestingRequired)
    );
  };
}
