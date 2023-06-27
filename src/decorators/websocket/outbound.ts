import {
  WebsocketOutbounds,
  WebsocketOutbound as WSOutbound,
} from "../../server/websocket/routing/outbound";
import { WebsocketOutboundDecoratorConfig } from "./config/websocket-outbound-decorator-config";

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
