import {
  HttpServer,
  StandaloneWebsocketRoute,
  WebsocketConnection,
  WebsocketRouter,
} from "../../src/active-connect";
import { WebsocketClient } from "./websocket-client";

let server: HttpServer;

beforeEach(async () => {
  server = new HttpServer(9008, true);
  await server.awaitStart();
});
afterEach(() => {
  server.stop();
});

it("should be possible to fetch the client information of a connection", async () => {
  class Testing {
    async route(data: any, conn: WebsocketConnection) {
      return conn.clientInformation;
    }
  }
  WebsocketRouter.registerStandaloneRoute(
    new StandaloneWebsocketRoute("fetch.data", {
      target: Testing.prototype,
      propertyKey: "route",
    })
  );
  expect(Testing).toBeDefined();

  const client = new WebsocketClient(9008);
  await client.awaitConnection();
  expect(client).toBeTruthy();
  client.send("___browser", { browser: "SampleLabel" });
  await client.awaitMessage("m.___browser");

  client.send("fetch.data", null);
  const data = (await client.awaitMessage("m.fetch.data")) as {
    ip: string;
    browser: string | undefined;
  };
  expect(data.ip).toBeDefined();
  expect(data.browser).toBeDefined();
  expect(data.browser).toBe("SampleLabel");
});

describe("websocket logging testing", () => {
  it.todo("should be possible to enable logging");
});

describe("websocket client ip access", () => {
  it.todo("should be possible to enable ip functionality");
});

it.todo("should be possible to access all connected clients");
