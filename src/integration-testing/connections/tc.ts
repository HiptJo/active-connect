import { WebsocketClient } from "..";
import {
  ActiveConnect,
  WebsocketConnection,
  WebsocketOutbounds,
  WebsocketRequest,
} from "../..";
import { WebsocketRouter } from "../../server/websocket/routing/router";
import * as randomstring from "randomstring";
import { JsonParser } from "../../json/json-parser";

/**
 * Websocket Connection wrapper, can be used to create integration-tests for applications.
 */
export class StubWebsocketConnection extends WebsocketConnection {
  private testingIdentifier: number;
  private static maxTestingIdentifier: number = 0;

  /**
   * Creates an instance of StubWebsocketConnection.
   */
  constructor() {
    super(null);
    this.testingIdentifier = StubWebsocketConnection.maxTestingIdentifier++;
    this.loadDecoratorConfig();
  }

  private loadDecoratorConfig() {
    // the loading of the decorator config usually occurs on starting the ws server (in production)
    WebsocketRouter.loadDecoratorConfig();
    WebsocketOutbounds.loadDecoratorConfig();
  }

  /**
   * Gets the testing identifier of the connection.
   */
  public get identifier() {
    return this.testingIdentifier;
  }

  private stack: {
    method: string;
    func: Function;
  }[] = [];

  /**
   * Sends a WebSocket message.
   * @param method - The method of the message.
   * @param value - The value of the message.
   * @param [messageId] - The ID of the message.
   * @returns `true` if the message is handled, `false` otherwise.
   */
  send(method: string, value: any, messageId?: number) {
    // parsing the string provides real data situation (date parsing, ...)
    const parsedValue = JsonParser.parse(JsonParser.stringify(value));
    if (this.stack.length > 0) {
      if (this.stack[0].method == method) {
        this.stack.shift()?.func(parsedValue);
        return true;
      }
    }
    if (method == "m.error") throw new Error(parsedValue);
    return false;
  }

  /**
   * This method is used to react to a specific message in a test case.
   * The promises will be resolved in the order of the expected methods.
   * All previously expected methods have to be received, before the method is expected.
   *
   * @param method - A message with this method is expected.
   * @param [timeout] - Timeout value in milliseconds before test fails.
   * @returns Promise, that is resolved once the provided method is received.
   */
  async expectMethod(method: string, timeout?: number): Promise<any> {
    return new Promise((func, reject) => {
      const stackObject = {
        method,
        func,
      };
      this.stack.push(stackObject);
      setTimeout(() => {
        if (this.stack.includes(stackObject)) {
          reject(
            "ActiveConnect: Message was not received within the timout inverval of " +
              ActiveConnect.getTimeout() +
              "ms: " +
              method
          );
        }
      }, timeout || ActiveConnect.getTimeout());
    });
  }

  /**
   * Does not expect to receive the method - if received, an error is thrown.
   * @param method - The method that should not be expected.
   * @returns A promise that is rejected with an error if the method is received.
   */
  dontExpectMethod(method: string) {
    return new Promise<void>((res, rej) => {
      const stackObject = {
        method,
        func: () => {
          rej("ActiveConnect: did receive unexpected method " + method + "");
        },
      };
      this.stack.push(stackObject);
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

  private messageId: number = 0;
  runRequest(method: string, data: any, noMessageId?: boolean) {
    const request = new WebsocketRequest(
      method,
      data,
      this,
      noMessageId ? undefined : this.messageId
    );
    this.messageId++;
    setTimeout(() => {
      new WebsocketRouter().route(request).then();
    }, 100);
  }

  public closeConnection() {
    this.onClose();
  }
}

/**
 * websocket connection wrapper, Can be used to create application-based integration tests.
 */
export class TCWrapper extends StubWebsocketConnection {
  /**
   * The router used for routing WebSocket requests.
   */
  public static router = new WebsocketRouter();

  protected client: WebsocketClient;

  /**
   * Creates an instance of TCWrapper.
   * @param token - The token for authentication (optional).
   */
  public constructor(token?: string | undefined) {
    super();
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

  /**
   * Sends a WebSocket message.
   * @param method - The method of the message.
   * @param value - The value of the message.
   * @param messageId - The ID of the message (optional).
   */
  send(method: string, value: any, messageId?: number) {
    const handled = super.send(method, value, messageId);
    if (!handled) {
      const parsedValue = JsonParser.parse(JsonParser.stringify(value));
      this.client.messageReceived({ method, data: parsedValue, messageId });
    }
    return true;
  }
}
