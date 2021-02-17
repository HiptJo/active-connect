import { WebsocketConnection } from "../../../../src/server/websocket/connection/connection";
import { WebsocketRequest } from "../../../../src/server/websocket/message/request";
import { WebsocketRoute } from "../../../../src/server/websocket/routing/route";
import { WebsocketRouter } from "../../../../src/server/websocket/routing/router";
import { WebsocketMocks } from "../../websocket-mocks";

it("should be possible to register a route", (d) => {
  const original = { value: "ok" };
  const route = new WebsocketRoute(
    "testing",
    (data: any, connection: WebsocketConnection) => {
      expect(data).toStrictEqual(original);
      d();
    }
  );
  const router = new WebsocketRouter();
  router.registerRoute(route);
  const conn = WebsocketMocks.getConnectionStub();
  expect(
    router.route(new WebsocketRequest("testing", original, conn))
  ).toBeTruthy();
});
it("should return false when routing to a non-existing route", () => {
  const original = { value: "ok" };
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();
  expect(
    router.route(new WebsocketRequest("testing.nonexisting", original, conn))
  ).toBeFalsy();
});
