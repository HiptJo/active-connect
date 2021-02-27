import { WebsocketClient } from "../client/client";

//@todo export from ng integration package

export function Outbound(method: string, requestingRequired?: boolean) {
  return function _Outbound(target: any, propertyKey: string): any {
    // property annotation
    WebsocketClient.expectOutbound(method, function setOutbound(data: any) {
      if (!target.___received) target.___received = {};
      target.___received[propertyKey] = true;
      target.___data[propertyKey] = data;
    });
    return {
      configurable: true,
      writeable: true,
      get() {
        if (!target.___received) target.___received = {};
        if (!target.___received[propertyKey] && requestingRequired) {
          WebsocketClient.send("request." + method, null).then();
        }
        if (!target.___data) target.___data = {};
        if (!target.loading) target.loading = {};
        if (!target.___data[propertyKey]) {
          target.loading[propertyKey] = true;
        } else if (target.loading[propertyKey]) {
          target.loading[propertyKey] = false;
        }
        return target.___data[propertyKey];
      },
      set(val: any) {
        if (!target.___data) target.___data = {};
        if (!target.loading) target.loading = {};
        target.loading[propertyKey] = false;
        return (target.___data[propertyKey] = val);
      },
    };
  };
}
