import { WebsocketConnection } from "../../src/server/websocket/connection/connection";

export class WebsocketMocks {
  static getConnectionStub(): StubWebsocketConnection {
    return new StubWebsocketConnection();
  }
}

export class StubWebsocketConnection extends WebsocketConnection {
  constructor() {
    super(null);
  }
  triggerMessage(method: string, value: any) {
    this.onMessage(JSON.stringify({ method: method, value: value }));
  }

  private messageHistory: Map<string, any> = new Map();
  send(method: string, data: any) {
    const func = this.expectedMessages.get(method);
    if (func) func(data);
    else this.messageHistory.set(method, data);
  }

  private expectedMessages: Map<string, Function> = new Map();
  awaitMessage<T>(method: string): Promise<T> {
    return new Promise((resolve) => {
      const historyElement = this.messageHistory.get(method);
      if (historyElement) {
        this.expectedMessages.set(method, null);
        resolve(historyElement);
      } else {
        this.expectedMessages.set(method, resolve);
      }
    });
  }
}
