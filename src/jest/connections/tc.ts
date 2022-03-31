import { WebsocketClient } from "..";
import { WebsocketConnection, WebsocketRequest } from "../../active-connect";
import { WebsocketRouter } from "../../server/websocket/routing/router";
import * as randomstring from "randomstring";
import { JsonParser } from "../../json/json-parser";

export class TCWrapper extends WebsocketConnection {
  public static router = new WebsocketRouter();
  protected client: WebsocketClient;
  public constructor(token?: string | undefined) {
    super(null);
    this.token = token || null;
    this.client = new WebsocketClient();

    this.clientInformation.ip = randomstring.generate(20);
    this.clientInformation.location = randomstring.generate(20);
    this.clientInformation.browser = "jest";

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
    // parsing the string provides real data situation (date parsing, ...)
    const parsedValue = JsonParser.parse(JsonParser.stringify(value));
    if (this.stack.length > 0) {
      if (this.stack[0].method == method) {
        this.stack.shift()?.func(parsedValue);
        if (method == "m.error") return;
      }
    }
    if (method == "m.error") throw new Error(parsedValue);
    this.client.messageReceived({ method, data: parsedValue, messageId });
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
