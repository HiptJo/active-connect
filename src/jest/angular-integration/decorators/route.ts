import { WebsocketClient } from "../client/client";

//@todo export from ng integration package

export function Route(method: string) {
  return function _Route(target: any, propertyKey: string): any {
    // method annotation
    const original = target[propertyKey];
    target[propertyKey] = async function execRoute(data: any): Promise<any> {
      const promise = original();
      const res = await WebsocketClient.send(method, data);
      await promise;
      return res;
    };
  };
}
