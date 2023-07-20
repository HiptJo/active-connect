import { DecorableFunction } from "../../../decorator-config";
import { WebsocketClient } from "../client/client";

export function OnSuccess(regexp: RegExp) {
  return function _Route(target: any, propertyKey: string): any {
    WebsocketClient.onSuccess(
      new DecorableFunction({ target, propertyKey }),
      regexp
    );
  };
}
