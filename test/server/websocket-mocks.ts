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

  send(method: string, data: any) {
    const func = this.expectedMessages.get(method);
    if (func) func(data);
  }
  private expectedMessages: Map<string, Function> = new Map();
  awaitMessage<T>(method: string): Promise<T> {
    return new Promise((resolve) => {
      this.expectedMessages.set(method, resolve);
    });
  }
}
