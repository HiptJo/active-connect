import { WebsocketRequest } from "../../../../src/server/websocket/message/request";
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
    route.Method = "test1";
    expect(route.Method).toBe("test1");
  });
  it("should throw when a route method is modified and the new method contains the separator", (d) => {
    try {
      route.Method = "test.test";
    } catch (e) {
      d();
    }
  });
});
describe("children management", () => {
  const route = new WebsocketRoute("testing", () => {});
  const child = new WebsocketRoute("child", (data: any) => {
    expect(data).toEqual({ in: "here" });
    return { value: "anything" };
  });
  it("should be possible to add a child to a route", async () => {
    route.addChild(child);
    const conn = WebsocketMocks.getConnectionStub();

    const res = await route.route(
      new WebsocketRequest("testing.child", { in: "here" }, conn),
      ["testing", "child"]
    );
    expect(res).toBeTruthy();

    const data = await conn.awaitMessage("m.testing.child");
    expect(data).toStrictEqual({ value: "anything" });
  });
});
