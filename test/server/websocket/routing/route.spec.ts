import { WebsocketRequest } from "../../../../src/server/websocket/message/request";
import { WebsocketResponse } from "../../../../src/server/websocket/message/response";
import { WebsocketRoute } from "../../../../src/server/websocket/routing/route";
import { WebsocketMocks } from "../../websocket-mocks";

it("should be possible to create a route", () => {
  const route = new WebsocketRoute("testing", () => {});
  expect(route).toBeTruthy();
});
it("should recect when creating a route containing a .", (d) => {
  try {
    expect(new WebsocketRoute("testing.fail", () => {})).toThrow();
  } catch (e) {
    d();
  }
});

describe("accessor testing", () => {
  const route = new WebsocketRoute("testing", () => {});
  it("should be possible to get the method of a route", () => {
    expect(route.Method).toBe("testing");
    expect(route.Children).toHaveLength(0);
    expect(route.Func).toBeDefined();
  });
});
describe("children management", () => {
  const route = new WebsocketRoute("testing", () => {});
  const child = new WebsocketRoute("child", (data: any) => {
    expect(data).toEqual({ in: "here" });
    return new WebsocketResponse({ value: "anything" });
  });
  it("should be possible to add a child to a route", async () => {
    route.addChild(child);
    const conn = WebsocketMocks.getConnectionStub();
    conn.awaitMessage("m.testing.child").then((data: any) => {
      expect(data).toStrictEqual({ value: "anything" });
    });
    const res = await route.route(
      new WebsocketRequest("testing.child", { in: "here" }, conn),
      ["testing", "child"]
    );
    expect(res).toBeTruthy();
  });
});
