import { WebsocketAuthenticator } from "../../server/websocket/auth/authenticator";
import { WebsocketDecoratorConfig } from "./config/websocket-decorator-config";
import { WebsocketOutboundDecoratorConfig } from "./config/websocket-outbound-decorator-config";
import { WebsocketRouteDecoratorConfig } from "./config/websocket-route-decorator-config";

export function Auth(authenticator: WebsocketAuthenticator) {
  return function _Auth(target: any, propertyKey: string): any {
    const configs: WebsocketDecoratorConfig[] = [
      WebsocketOutboundDecoratorConfig.get(target, propertyKey),
      WebsocketRouteDecoratorConfig.get(target, propertyKey),
    ];
    for (var config of configs) {
      if (config.authenticator) {
        throw new Error(
          "Error for config " +
            propertyKey +
            ": Can not define authentication as another authenticator is already present."
        );
      }
      config.authenticator = authenticator;
    }
  };
}

export function ModifiesAuthentication(target: any, propertyKey: string): any {
  const config = WebsocketRouteDecoratorConfig.get(target, propertyKey);
  config.modifiesAuthentication = true;
}

export function ResendAfterAuthenticationChange(
  target: any,
  propertyKey: string
): any {
  const config = WebsocketOutboundDecoratorConfig.get(target, propertyKey);
  config.resendAfterAuthenticationChange = true;
}
