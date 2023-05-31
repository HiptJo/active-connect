import { WebsocketRequest, WebsocketRouter } from "../../../../src";
import {
  Outbound,
  WebsocketOutbound,
} from "../../../../src/server/websocket/routing/outbound";
import { WebsocketMocks } from "../../websocket-mocks";
beforeEach(() => {
  WebsocketOutbound.clear();
});

class target {
  out() {
    return {
      value: "ok",
    };
  }
  requestable() {
    return { value: "ok-requested" };
  }

  private data = "default";
  sendData() {
    return this.data;
  }
  setData(data: string) {
    this.data = data;
  }
}

beforeEach(() => {
  WebsocketOutbound.addOutbound(
    new Outbound(
      "data",
      { target: target.prototype, propertyKey: "sendData" },
      false,
      false
    )
  );
});

describe("default outbound", () => {
  it("should be possible to create a new outbound", () => {
    const outbound = new Outbound("testing.delivery", {
      target: target.prototype,
      propertyKey: "out",
    });
    expect(outbound).toBeDefined();
    WebsocketOutbound.addOutbound(outbound);
    expect(WebsocketOutbound.getOutbound("testing.delivery")).toBe(outbound);
  });
  it("should be possible to send a outbound", async () => {
    const outbound = new Outbound("testing.delivery", {
      target: target.prototype,
      propertyKey: "out",
    });

    WebsocketOutbound.addOutbound(outbound);

    const conn = WebsocketMocks.getConnectionStub();
    WebsocketOutbound.sendToConnection(conn);

    const data: any = await conn.awaitMessage("testing.delivery");
    expect(data.value).toBe("ok");
  });

  it("should throw when requesting a non-existing outbound", async () => {
    WebsocketOutbound.clear();
    const conn = WebsocketMocks.getConnectionStub();
    await expect(
      WebsocketOutbound.requestOutbound("testing1.notfound", conn)
    ).rejects.toThrow();
  });
  it("should return false when fetching a non-existing outbound by method", () => {
    expect(WebsocketOutbound.getOutbound("idonotexist")).toBeFalsy();
  });
});

describe("lazy-loading outbound", () => {
  it("should be possible to receive a requesting outbound", async () => {
    WebsocketOutbound.addOutbound(
      new Outbound(
        "testing.requestable",
        { target: target.prototype, propertyKey: "requestable" },
        true
      )
    );
    const conn = WebsocketMocks.getConnectionStub();
    const router = new WebsocketRouter();
    router.route(
      new WebsocketRequest("request.testing.requestable", null, conn)
    );
    const data: any = await conn.awaitMessage("testing.requestable");
    expect(data.value).toBe("ok-requested");
  });
});

describe("subscription testing", () => {
  describe("default subscription", () => {
    it.todo(
      "should create a subscription on accessing the data (eager loading)"
    );
    it.todo(
      "should create a subscription on accessing the data (lazy loading)"
    );
    it.todo("should re-send high-priority data to subscribed connections");
    it.todo("should re-send low-priority data to subscribed connections");
    it.todo("should resend high-priority data for subscribed connections");
    it.todo("should resend low-priority data for subscribed connections");
    it.todo("should cancel subscription once the client closes the connection");
  });

  describe("filtered subscription", () => {
    it.todo(
      "should create a subscription on accessing the data (eager loading)"
    );
    it.todo(
      "should create a subscription on accessing the data (lazy loading)"
    );
    it.todo(
      "should re-send high-priority data to subscribed connections (filtered)"
    );
    it.todo(
      "should not re-send high-priority data to other-filter subscribed connections (filtered)"
    );
    it.todo("should re-send low-priority data to subscribed connections");
    it.todo(
      "should not re-send low-priority data to other-filter subscribed connections"
    );
    it.todo(
      "should cancel filtered subscription once the client closes the connection"
    );
  });
});

describe("after-auth resend testing", () => {
  it.todo("should be possible to manually trigger auth resend");
  it.todo("should resend data after calling a route with resendAuth tag");
});
