import { StubWebsocketConnection } from "../../src/integration-testing";

export class WebsocketMocks {
  static getConnectionStub(): StubWebsocketConnection {
    return new StubWebsocketConnection();
  }
}
