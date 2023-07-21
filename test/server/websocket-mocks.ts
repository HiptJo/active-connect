import { StubWebsocketConnection } from "../../src/integration-testing";

export class WebsocketMocks {
  static getConnectionStub(
    supportsCache?: boolean,
    authToken?: string
  ): StubWebsocketConnection {
    return new StubWebsocketConnection(supportsCache, authToken);
  }
}
