import {
  HttpServer,
  OnWebsocketConnectionClosed,
  StandaloneRoute,
  StandaloneWebsocketRoute,
  WebsocketConnection,
  WebsocketRouter,
  WebsocketServer,
} from "../../src/";
import { WebsocketClient } from "../../src/integration-testing/connections/websocket-client";
import * as test from "supertest";

let server: HttpServer;

beforeAll(async () => {
  server = new HttpServer(9008, true);
  await server.awaitStart();
});
afterAll(async () => {
  await server.stop();
});

it("should be possible to access the websocket entrypoint GET /wss", async () => {
  await test(server.App)
    .get("/wss")
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe("wss entrypoint");
    });
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
  client.close();
  expect(data.ip).toBeDefined();
  expect(data.browser).toBeDefined();
  expect(data.browser).toBe("SampleLabel");
});

describe("websocket client ip access", () => {
  beforeAll(() => {
    return new Promise<void>((resolve) => {
      var http = require("http");

      http.get(
        { host: "api.ipify.org", port: 80, path: "/" },
        function (resp: any) {
          resp.on("data", function (ip: string) {
            process.env.ip_override = ip.toString();
            resolve();
          });
        }
      );
    });
  });
  jest.setTimeout(60000);
  it("should be possible to enable ip functionality", async () => {
    WebsocketServer.enableIpLocationFetching();
    class Testing {
      @StandaloneRoute("location.test")
      route(data: void, conn: WebsocketConnection) {
        expect(conn.clientInformation.ip).toBeDefined();
        expect(conn.clientInformation.location).toBeDefined();
        expect(conn.clientInformation.location.length).toBeGreaterThan(3);
        return conn.clientInformation.location;
      }
    }
    expect(Testing).toBeDefined();

    const client = new WebsocketClient(9008);
    await client.awaitConnection();
    client.send("location.test", "null");
    const location = await client.awaitMessage("m.location.test");
    expect(location).toBeDefined();
    client.close();
  });
});

it("should be possible to access all connected clients", async () => {
  const client = new WebsocketClient(9008);
  await client.awaitConnection();
  const connections = server.getWebsocketInstance().getConnections();
  expect(connections).toBeDefined();
  expect(connections.length).toBeGreaterThanOrEqual(1);
  client.close();
});

it("should invoke methods decorated with @OnWebsocketConnectionClosed after closing the websocket connection (multiple decorators should be supported)", (done) => {
  class Testing {
    private count = 2;

    @OnWebsocketConnectionClosed
    onClosed1() {
      if (--this.count == 0) done();
    }

    @OnWebsocketConnectionClosed
    onClosed2() {
      if (--this.count == 0) done();
    }
  }
  expect(Testing).toBeDefined();
  const client = new WebsocketClient(9008);
  client.awaitConnection().then(() => {
    client.close();
  });
});

it("should send a ping message to the client every 45 seconds", async () => {
  jest.setTimeout(46000);
  const client = new WebsocketClient(9008);
  await client.awaitConnection();
  await client.awaitPing();
  client.close();
});

it("should be possible to send an ip to the server (deprecated)", async () => {
  const client = new WebsocketClient(9008);
  await client.awaitConnection();
  client.send("___ip", "1.1.1.1");
  await client.awaitMessage("m.___ip");
  client.close();
});

describe("outbound caching", () => {
  it("should state that caching is not enabled for regular connections", async () => {
    const client = new WebsocketClient(9008);
    await client.awaitConnection();

    const connections = server.getWebsocketInstance().getConnections();
    expect(
      connections.filter((c) => c.id == client.id)[0].supportsCaching
    ).toBeFalsy();

    client.close();
  });

  it("should enable caching when the caching header is present", async () => {
    const client = new WebsocketClient(9008, true);
    await client.awaitConnection();

    const connections = server.getWebsocketInstance().getConnections();
    expect(
      connections.filter((c) => c.id == client.id)[0].supportsCaching
    ).toBeTruthy();

    client.close();
  });

  it("should enable caching when the caching url is present", async () => {
    const client = new WebsocketClient(9008, true, true);
    await client.awaitConnection();

    const connections = server.getWebsocketInstance().getConnections();
    expect(
      connections.filter((c) => c.id == client.id)[0].supportsCaching
    ).toBeTruthy();

    client.close();
  });
});
