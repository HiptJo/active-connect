import {
  WebsocketOutbound,
  Outbound as WSOutbound,
} from "../../server/websocket/routing/outbound";

export function Outbound(method: string, requestingRequired?: boolean) {
  return function (target: any, propertyKey: string): any {
    // method annotation
    WebsocketOutbound.addOutbound(
      new WSOutbound(method, target[propertyKey], requestingRequired)
    );
  };
}
