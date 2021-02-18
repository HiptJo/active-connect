import { WebsocketConnection } from "../../../../src/server/websocket/connection/connection";
import { WebsocketRequest } from "../../../../src/server/websocket/message/request";
import { WebsocketRoute } from "../../../../src/server/websocket/routing/route";
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
it("should return false when routing to a non-existing route", () => {
  const original = { value: "ok" };
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();
  expect(WebsocketRouter.Routes).toHaveLength(0);

  expect(
    router.route(new WebsocketRequest("testing.nonexisting", original, conn))
  ).toBeFalsy();
});
