import {
  HttpServer,
  StandaloneRoute,
  WebsocketConnection,
  WebsocketRequest,
} from "../../src/active-connect";
import { WebsocketRouter } from "../../src/server/websocket/routing/router";
import { WebsocketMocks } from "./websocket-mocks";

let server: HttpServer;

beforeEach(async () => {
  server = new HttpServer(9010, true);
  await server.awaitStart();
});
afterEach(() => {
  server.stop();
});

it("should be possible to fetch the client information of a connection", async () => {
  class Testing {
    @StandaloneRoute("fetch.data")
    async route(data: any, conn: WebsocketConnection) {
      return conn.clientInformation;
    }
  }
  expect(Testing).toBeDefined();

  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();

  await router.route(
    new WebsocketRequest("___browser", { browser: "SampleLabel" }, conn)
  );
  await router.route(new WebsocketRequest("fetch.data", null, conn));
  const data = (await conn.awaitMessage("m.fetch.data")) as {
    ip: string;
    browser: string | undefined;
  };
  expect(data.ip).toBeDefined();
  expect(data.browser).toBeDefined();
  expect(data.browser).toBe("SampleLabel");
});
