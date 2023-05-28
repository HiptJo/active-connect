import { WebsocketClient } from "..";
import { WebsocketConnection, WebsocketRequest } from "../..";
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

  /**
   * This method is used to react to a specific message in a test case.
   * The promises will be resolved in the order of the expected methods.
   * All previously expected methods have to be received, before the method is expected.
   *
   * @param method - A message with this method is expected.
   * @returns Promise, that is resolved once the provided method is received.
   */
  async expectMethod(method: string): Promise<any> {
    return new Promise((func) => {
      this.stack.push({
        method,
        func,
      });
    });
  }

  /**
   * This method is used to catch an error message.
   *
   * @returns Promise, that is resolved once a `m.error` message is received.
   */
  async expectError(): Promise<any> {
    return await this.expectMethod("m.error");
  }

  /**
   * Wait a given amount of ms during a test case.
   *
   * @param ms - Time duration in milliseconds before the promise is resolved.
   * @returns Promise, that is resolved after the given amount of milliseconds.
   */
  timeout(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
  }
}
