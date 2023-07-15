import { WebsocketRequest } from "../../../../src/server/websocket/message/request";
import {
  StandaloneWebsocketRoute,
  WebsocketRoute,
} from "../../../../src/server/websocket/routing/route";
import { WebsocketRouter } from "../../../../src/server/websocket/routing/router";
import { WebsocketMocks } from "../../websocket-mocks";

beforeEach(() => {
  WebsocketRouter.Routes.splice(0, WebsocketRouter.Routes.length);
  expect(WebsocketRouter.Routes).toHaveLength(0);
});

describe("default routes", () => {
  const original = { value: "ok" };
  class target {
    f(data: { value: string }) {
      expect(data).toStrictEqual(original);
      return -1;
    }
    c(data: { value: string }) {
      expect(data).toBe(original);
      return -2;
    }
    increase(data: number) {
      return data + 1;
    }
  }

  const router = new WebsocketRouter();
  var conn = WebsocketMocks.getConnectionStub();
  beforeEach(() => {
    const route = new WebsocketRoute("testing", {
      target: target.prototype,
      propertyKey: "f",
    });
    const child = new WebsocketRoute("c", {
      target: target.prototype,
      propertyKey: "c",
    });
    route.addChild(child);
    const increase = new WebsocketRoute("increase", {
      target: target.prototype,
      propertyKey: "increase",
    });
    route.addChild(increase);
    WebsocketRouter.registerRoute(route);

    conn = WebsocketMocks.getConnectionStub();
  });

  it("should have registered the required routes", () => {
    expect(WebsocketRouter.Routes).toHaveLength(1);
  });

  it("should be possible to register a route", async () => {
    expect(
      router.route(new WebsocketRequest("testing", original, conn))
    ).toBeTruthy();
    expect(await conn.expectMethod("m.testing")).toBe(-1);
  });

  it("should be possible to route to a child", async () => {
    expect(
      router.route(new WebsocketRequest("testing.c", original, conn))
    ).toBeTruthy();
    expect(await conn.expectMethod("m.testing.c")).toBe(-2);
  });

  it("should throw when a fetched child-route is not defined", async () => {
    await expect(async () => {
      WebsocketRouter.getRouteByMethod("testing.nonex");
    }).rejects.toThrow("nonex");
  });

  it("should throw when routing a non-existing baseroute", async () => {
    await expect(
      router.route(new WebsocketRequest("nonexisting", {}, conn))
    ).rejects.toThrow("nonex");
  });

  it("should be possible to call a route with data", async () => {
    expect(
      router.route(new WebsocketRequest("testing.increase", 5, conn))
    ).toBeTruthy();
    expect(await conn.expectMethod("m.testing.increase")).toBe(6);
  });
});
describe("standalone routes", () => {
  const original = { value: "ok" };
  class target {
    f(data: { value: string }) {
      expect(data).toStrictEqual(original);
      return -1;
    }
    c(data: { value: string }) {
      expect(data).toBe(original);
      return -2;
    }
    increase(data: number) {
      return data + 1;
    }
  }

  const router = new WebsocketRouter();
  beforeAll(() => {
    const f = new StandaloneWebsocketRoute("stand.f", {
      target: target.prototype,
      propertyKey: "f",
    });
    const c = new StandaloneWebsocketRoute("stand.c", {
      target: target.prototype,
      propertyKey: "c",
    });
    const increase = new StandaloneWebsocketRoute("stand.increase", {
      target: target.prototype,
      propertyKey: "increase",
    });
    WebsocketRouter.registerStandaloneRoute(f);
    WebsocketRouter.registerStandaloneRoute(c);
    WebsocketRouter.registerStandaloneRoute(increase);
  });

  it("should have registered the required routes", () => {
    expect(WebsocketRouter.StandaloneRoutes).toHaveLength(3);
  });

  it("should be possible to register a route", async () => {
    var conn = WebsocketMocks.getConnectionStub();
    expect(
      router.route(new WebsocketRequest("stand.f", original, conn))
    ).toBeTruthy();
    expect(await conn.expectMethod("m.stand.f")).toBe(-1);
  });

  it("should be possible to route to a child", async () => {
    var conn = WebsocketMocks.getConnectionStub();
    expect(
      router.route(new WebsocketRequest("stand.c", original, conn))
    ).toBeTruthy();
    expect(await conn.expectMethod("m.stand.c")).toBe(-2);
  });

  it("should be possible to call a route with data", async () => {
    var conn = WebsocketMocks.getConnectionStub();
    expect(
      router.route(new WebsocketRequest("stand.increase", 5, conn))
    ).toBeTruthy();
    expect(await conn.expectMethod("m.stand.increase")).toBe(6);
  });
});
