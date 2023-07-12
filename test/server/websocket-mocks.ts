import {
  WebsocketOutbounds,
  WebsocketRequest,
  WebsocketRouter,
} from "../../src";
import { WebsocketConnection } from "../../src/server/websocket/connection/connection";

export class WebsocketMocks {
  static getConnectionStub(): StubWebsocketConnection {
    return new StubWebsocketConnection();
  }
}

export class StubWebsocketConnection extends WebsocketConnection {
  private testingIdentifier: number;
  private static maxTestingIdentifier: number = 0;

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

  public get identifier() {
    return this.testingIdentifier;
  }

  private messageHistory: Map<string, any> = new Map();
  send(method: string, data: any) {
    if (this.expectedMessages && this.expectedMessages.has(method)) {
      const func = this.expectedMessages.get(method);
      this.expectedMessages.delete(method);
      func(data);
    } else {
      if (method == "m.error") {
        throw new Error(
          "Received error message from websocket server: " + data
        );
      }
      this.messageHistory.set(method, data);
    }
  }

  private expectedMessages: Map<string, Function | null> = new Map();
  awaitMessage<T>(method: string): Promise<T> {
    return new Promise((resolve) => {
      if (this.messageHistory.has(method)) {
        const historyElement = this.messageHistory.get(method);
        this.messageHistory.delete(method);
        resolve(historyElement);
      } else {
        this.expectedMessages.set(method, resolve);
      }
    });
  }

  private messageId: number = 0;
  async runRequest(method: string, data: any, noMessageId?: boolean) {
    new WebsocketRouter().route(
      new WebsocketRequest(
        method,
        data,
        this,
        noMessageId ? undefined : this.messageId
      )
    );
    this.messageId++;
  }

  public closeConnection() {
    this.onClose();
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
