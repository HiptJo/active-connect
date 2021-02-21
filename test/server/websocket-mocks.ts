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

  private messageHistory: Map<string, any> = new Map();
  send(method: string, data: any) {
    if (this.expectedMessages.has(method)) {
      const func = this.expectedMessages.get(method);
      this.expectedMessages.delete(method);
      func(data);
    } else {
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
}
