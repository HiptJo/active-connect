import {
  WebsocketRequest,
  WebsocketRoute,
  WebsocketRouter,
} from "../../../../src";
import {
  Outbound,
  WebsocketOutbound,
} from "../../../../src/server/websocket/routing/outbound";
import { StubWebsocketConnection, WebsocketMocks } from "../../websocket-mocks";
import { MessageFilter } from "../../../../src/server/websocket/auth/authenticator";

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

describe.only("error handling", () => {
  class target {
    async outbound(conn: StubWebsocketConnection) {
      throw Error("...");
    }
  }

  beforeEach(() => {
    const out = new Outbound("d.out", {
      target: target.prototype,
      propertyKey: "outbound",
    });
    WebsocketOutbound.addOutbound(out);
  });

  it("should send m.error when a error is thrown inside the outbound method", async () => {
    const conn = WebsocketMocks.getConnectionStub();
    expect(await conn.awaitMessage("m.error")).toBe("...");
  });
});

describe("subscription testing", () => {
  let conn = WebsocketMocks.getConnectionStub();
  beforeEach(() => {
    conn = WebsocketMocks.getConnectionStub();
  });

  class filter implements MessageFilter {
    async filter(
      response: any | any[],
      connection: StubWebsocketConnection
    ): Promise<number> {
      return connection.identifier;
    }
  }

  class target {
    data = new Map<number, string[]>();
    outbound(conn: StubWebsocketConnection) {
      return this.data.get(conn.identifier) || [];
    }
    async addEntry(content: string, conn: StubWebsocketConnection) {
      const identifier = await new filter().filter(null, conn);
      var data = this.data.get(identifier);
      if (data) {
        data.push(content);
      } else {
        this.data.set(identifier, [content]);
      }
    }
  }

  beforeEach(() => {
    const out1 = new Outbound("d.high", {
      target: target.prototype,
      propertyKey: "outbound",
    });
    out1.subscribeChanges();
    WebsocketOutbound.addOutbound(out1);
    const out2 = new Outbound("d.low", {
      target: target.prototype,
      propertyKey: "outbound",
    });
    out2.subscribeChanges();
    WebsocketOutbound.addOutbound(out2);

    const route = new WebsocketRoute("add", {
      target: target.prototype,
      propertyKey: "addEntry",
    });
    route.modifies(["d.high", "d.low"]);
    WebsocketRouter.registerRoute(route);
  });

  describe("default subscription", () => {
    it("should re-send high-priority data to subscribed connections", async () => {
      WebsocketOutbound.sendToConnection(conn);
      expect(await conn.awaitMessage("d.high")).toHaveLength(0);
      conn.runRequest("add", "new");
      const updatedData = await conn.awaitMessage("d.high");
      expect(updatedData).toHaveLength(1);
      expect(updatedData).toStrictEqual(["new"]);
      await conn.awaitMessage("m.add");
    });
    it("should re-send low-priority data to subscribed connections", async () => {
      WebsocketOutbound.sendToConnection(conn);
      expect(await conn.awaitMessage("d.low")).toHaveLength(0);
      conn.runRequest("add", "new");
      await conn.awaitMessage("m.add");
      const updatedData = await conn.awaitMessage("d.low");
      expect(updatedData).toHaveLength(1);
      expect(updatedData).toStrictEqual(["new"]);
    });
    it("should cancel subscription once the client closes the connection", async () => {
      WebsocketOutbound.sendToConnection(conn);
      expect(await conn.awaitMessage("d.high")).toHaveLength(0);
      conn.closeConnection();

      const newConn = WebsocketMocks.getConnectionStub();
      newConn.runRequest("add", "_");
      conn
        .awaitMessage("d.high")
        .then(() => fail("Data was sent to a closed connection"));
      await newConn.awaitMessage("m.add");
    });
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
