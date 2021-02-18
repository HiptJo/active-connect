import { WebsocketConnection } from "../../../../src/server/websocket/connection/connection";
import { WebsocketRequest } from "../../../../src/server/websocket/message/request";
import { WebsocketRoute } from "../../../../src/server/websocket/routing/route";
import { StandaloneWebsocketRoute } from "../../../../src/server/websocket/routing/route-standalone";
import { WebsocketRouter } from "../../../../src/server/websocket/routing/router";
import { WebsocketMocks } from "../../websocket-mocks";

beforeEach(() => {
  WebsocketRouter.Routes.splice(0, WebsocketRouter.Routes.length);
  expect(WebsocketRouter.Routes).toHaveLength(0);
});

it("should be possible to register a route", (d) => {
  const original = { value: "ok" };
  const route = new WebsocketRoute(
    "testing",
    (data: any, connection: WebsocketConnection) => {
      expect(data).toStrictEqual(original);
      d();
    }
  );
  WebsocketRouter.registerRoute(route);
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();
  expect(
    router.route(new WebsocketRequest("testing", original, conn))
  ).toBeTruthy();
});
it("should throw when routing to route with func=null", async (d) => {
  const original = { value: "ok" };
  const route = new WebsocketRoute("testing", null);
  WebsocketRouter.registerRoute(route);
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();
  await router
    .route(new WebsocketRequest("testing", original, conn))
    .catch((e) => {
      d();
    });
});
it("should throw when routing to child with func=null", async (d) => {
  const original = { value: "ok" };
  const route = new WebsocketRoute("testing", null);
  route.addChild(new WebsocketRoute("a", null));
  WebsocketRouter.registerRoute(route);
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();

  await router
    .route(new WebsocketRequest("testing.a", original, conn))
    .catch(() => {
      d();
    });
});
it("should be possible to route to a child", (d) => {
  const original = { value: "ok5" };
  const route = new WebsocketRoute("testing", null);
  route.addChild(
    new WebsocketRoute("c", (data: any, conn: WebsocketConnection) => {
      expect(data).toBe(original);
      d();
    })
  );
  WebsocketRouter.registerRoute(route);
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();
  expect(
    router.route(new WebsocketRequest("testing.c", original, conn))
  ).toBeTruthy();
});
it("should be possible to get a child route by method", () => {
  const route = new WebsocketRoute("testing", null);
  route.addChild(new WebsocketRoute("fetch", null));
  WebsocketRouter.registerRoute(route);
  expect(WebsocketRouter.getRouteByMethod("testing.fetch")).toBeDefined();
  expect(WebsocketRouter.getRouteByMethod("testing.fetch").Method).toBe(
    "fetch"
  );
});
it("should throw when a fetched child-route is not defined", (d) => {
  const route = new WebsocketRoute("testing", null);
  WebsocketRouter.registerRoute(route);
  try {
    expect(
      WebsocketRouter.getRouteByMethod("testing.nonexisting")
    ).toBeDefined();
  } catch (e) {
    d();
  }
});
it("should throw when routing a non-existing baseroute", (d) => {
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();
  router.route(new WebsocketRequest("nonexisting", {}, conn)).catch(() => {
    d();
  });
});

it("should be possible to call a route without data", async (d) => {
  const original: null = null;
  const route = new WebsocketRoute(
    "testing",
    (data: any, connection: WebsocketConnection) => {
      expect(data).toStrictEqual(original);
      d();
    }
  );
  WebsocketRouter.registerRoute(route);
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();
  expect(
    await router.route(new WebsocketRequest("testing", original, conn))
  ).toBeTruthy();
});

it("should be possible to register a standalone route", () => {
  WebsocketRouter.registerStandaloneRoute(
    new StandaloneWebsocketRoute(
      "method.standalone",
      (data: any, conn: WebsocketConnection) => {
        return { value: "standalone" };
      }
    )
  );
});
