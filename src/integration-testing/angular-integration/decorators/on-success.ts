import { WebsocketClient } from "../client/client";

export function OnSuccess(regexp: RegExp) {
  return function _Route(target: any, propertyKey: string): any {
    WebsocketClient.onSuccess(target[propertyKey], regexp);
  };
}
