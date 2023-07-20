import { StubWebsocketConnection } from "../../src/integration-testing";

export class WebsocketMocks {
  static getConnectionStub(supportsCache?: boolean): StubWebsocketConnection {
    return new StubWebsocketConnection(supportsCache);
  }
}
