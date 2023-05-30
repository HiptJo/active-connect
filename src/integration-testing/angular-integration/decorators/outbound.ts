import { WebsocketClient } from "../client/client";

//@todo export from ng integration package

export function Outbound(method: string, requestingRequired?: boolean) {
  return function _Outbound(target: any, propertyKey: string): any {
    // property annotation
    WebsocketClient.expectOutbound(method, function setOutbound(data: any) {
      if (!target.___received) target.___received = {};
      if (!target.___data) target.___data = {};
      target.___received[propertyKey] = true;
      target.___data[propertyKey] = data;
    });
    return {
      configurable: true,
      writeable: true,
      get() {
        if (!this.___requested) this.___requested = {};
        if (!this.___requested[propertyKey] && requestingRequired) {
          this.___requested[propertyKey] = true;
          this.client.send("request." + method, null).then();
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

// @todo add this model to the outbound decorator
export class OutboundModel<T> {
  private data: T | undefined = undefined;
  private requested: boolean = false;
  private requestingRequired: boolean = false;
  private loading: boolean = false;

  constructor(requestingRequired?: boolean) {
    if (requestingRequired) {
      this.requestingRequired = true;
    }
  }

  public get Data() {
    if (this.requestingRequired && !this.requested) {
      this.requestData();
    }
    if (this.data == undefined) {
      this.loading = true;
    } else {
      this.loading = false;
    }
    return this.data;
  }
  public set Data(data: T) {
    this.data = data;
  }

  public get hasData() {
    return this.data != undefined;
  }
  public get isLoading() {
    return !this.hasData && this.loading;
  }

  private requestData() {
    this.requested = true;
  }
}
