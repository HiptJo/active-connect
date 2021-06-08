import { WebsocketClient } from "..";
import { WebsocketConnection, WebsocketRequest } from "../../active-connect";
import { WebsocketRouter } from "../../server/websocket/routing/router";

export class TCWrapper extends WebsocketConnection {
  public static router = new WebsocketRouter();
  protected client: WebsocketClient;
  public constructor(token?: string | undefined) {
    super(null);
    this.token = token || null;
    this.client = new WebsocketClient();

    const _this = this;
    this.client.defineSocketCallback(async function callback(
      method: string,
      data: any,
      messageId: number
    ) {
      return await TCWrapper.router.route(
        new WebsocketRequest(method, data, _this, messageId)
      );
    });
  }

  private stack: {
    method: string;
    func: Function;
  }[] = [];

  send(method: string, value: any, messageId?: number) {
    if (this.stack.length > 0) {
      if (this.stack[0].method == method) {
        this.stack.shift()?.func(value);
        if (method == "m.error") return;
      }
    }
    if (method == "m.error") throw value;
    this.client.messageReceived({ method, data: value, messageId });
  }

  async expectMethod(method: string): Promise<any> {
    return new Promise((func) => {
      this.stack.push({
        method,
        func,
      });
    });
  }
}
