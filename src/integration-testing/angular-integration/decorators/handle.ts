import { DecorableFunction } from "../../../server";
import { WebsocketClient } from "../client/client";

//@todo export from ng integration package

export function Handle(method: string) {
  return function _Handle(target: any, propertyKey: string): any {
    // method annotation
    WebsocketClient.registerHandle(
      method,
      new DecorableFunction({ target, propertyKey })
    );
  };
}
