import {
  WebsocketRequest,
  WebsocketRoute,
  WebsocketRouter,
} from "../../../../src";
import {
  WebsocketOutbound,
  WebsocketOutbounds,
} from "../../../../src/server/websocket/routing/outbound";
import { StubWebsocketConnection, WebsocketMocks } from "../../websocket-mocks";
import { MessageFilter } from "../../../../src/server/websocket/auth/authenticator";
import { testEach } from "../../../../src/jest";

beforeEach(() => {
  WebsocketOutbounds.clear();
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
  WebsocketOutbounds.addOutbound(
    new WebsocketOutbound(
      "data",
      { target: target.prototype, propertyKey: "sendData" },
      false,
      false
    )
  );
});

it("should have registered 1 outbound", () => {
  expect(WebsocketOutbounds.size).toBe(1);
});

describe("default outbound", () => {
  it("should be possible to create a new outbound", () => {
    const outbound = new WebsocketOutbound("testing.delivery", {
      target: target.prototype,
      propertyKey: "out",
    });
    expect(outbound).toBeDefined();
    WebsocketOutbounds.addOutbound(outbound);
    expect(WebsocketOutbounds.getOutbound("testing.delivery")).toBe(outbound);
  });
  it("should be possible to send a outbound", async () => {
    const outbound = new WebsocketOutbound("testing.delivery", {
      target: target.prototype,
      propertyKey: "out",
    });

    WebsocketOutbounds.addOutbound(outbound);

    const conn = WebsocketMocks.getConnectionStub();

    const data: any = await conn.awaitMessage("testing.delivery");
    expect(data.value).toBe("ok");
  });

  it("should throw when requesting a non-existing outbound", async () => {
    WebsocketOutbounds.clear();
    const conn = WebsocketMocks.getConnectionStub();
    await expect(
      WebsocketOutbounds.sendSingleOutboundByMethod("testing1.notfound", conn)
    ).rejects.toThrow();
  });
  it("should return false when fetching a non-existing outbound by method", () => {
    expect(WebsocketOutbounds.getOutbound("idonotexist")).toBeFalsy();
  });
});

describe("lazy-loading outbound", () => {
  it("should be possible to receive a requesting outbound", async () => {
    WebsocketOutbounds.addOutbound(
      new WebsocketOutbound(
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

describe("error handling", () => {
  class target {
    async outbound1(conn: StubWebsocketConnection) {
      throw Error("...");
    }
    async outbound2(conn: StubWebsocketConnection) {
      throw "...";
    }
  }

  testEach<string>(["outbound1", "outbound2"], [], (propertyKey: string) => {
    beforeEach(() => {
      const out = new WebsocketOutbound("d.out", {
        target: target.prototype,
        propertyKey,
      });
      WebsocketOutbounds.addOutbound(out);
    });

    it("should send m.error when a error is thrown inside the outbound method", async () => {
      const conn = WebsocketMocks.getConnectionStub();
      expect(await conn.awaitMessage("m.error")).toBe("...");
    });
  });

  it("should throw when updates should be sent for a non-existing outbound method", async () => {
    await expect(
      WebsocketOutbounds.sendUpdates(["unknown.method"])
    ).rejects.toThrow(
      'Websocket: Can not send updates to outbound "unknown.method" as it does not exist.'
    );
  });
});

describe("subscription testing", () => {
  describe("default subscription", () => {
    let conn1 = WebsocketMocks.getConnectionStub();
    let conn2 = WebsocketMocks.getConnectionStub();
    beforeEach(() => {
      conn1 = WebsocketMocks.getConnectionStub();
      conn2 = WebsocketMocks.getConnectionStub();
    });

    class target {
      data: string[] = [];
      outbound(conn: StubWebsocketConnection) {
        return this.data;
      }
      async addEntry(content: string, conn: StubWebsocketConnection) {
        this.data.push(content);
      }
    }

    beforeEach(() => {
      const out1 = new WebsocketOutbound("d.high", {
        target: target.prototype,
        propertyKey: "outbound",
      });
      out1.subscribeChanges();
      WebsocketOutbounds.addOutbound(out1);
      const out2 = new WebsocketOutbound("d.low", {
        target: target.prototype,
        propertyKey: "outbound",
      });
      out2.subscribeChanges();
      WebsocketOutbounds.addOutbound(out2);

      const route = new WebsocketRoute("add", {
        target: target.prototype,
        propertyKey: "addEntry",
      });
      route.modifies(["d.high", "d.low"]);
      WebsocketRouter.registerRoute(route);

      // reset data before each test run
      if ((target.prototype as any).___data?._obj?.data) {
        (target.prototype as any).___data._obj.data = [];
      }
    });

    it("should re-send high-priority data to subscribed connections", async () => {
      expect(
        await Promise.all([
          conn1.awaitMessage("d.high"),
          conn2.awaitMessage("d.high"),
        ])
      ).toStrictEqual([[], []]);
      conn1.runRequest("add", "new");
      expect(
        await Promise.all([
          conn1.awaitMessage("d.high"),
          conn2.awaitMessage("d.high"),
        ])
      ).toStrictEqual([["new"], ["new"]]);
      await conn1.awaitMessage("m.add");
    });
    it("should re-send low-priority data to subscribed connections", async () => {
      expect(
        await Promise.all([
          conn1.awaitMessage("d.low"),
          conn2.awaitMessage("d.low"),
        ])
      ).toStrictEqual([[], []]);
      conn1.runRequest("add", "new");
      await conn1.awaitMessage("m.add");
      expect(
        await Promise.all([
          conn1.awaitMessage("d.low"),
          conn2.awaitMessage("d.low"),
        ])
      ).toStrictEqual([["new"], ["new"]]);
    });
    it("should cancel subscription once the client closes the connection", async () => {
      expect(await conn1.awaitMessage("d.high")).toHaveLength(0);
      conn1.closeConnection();

      const newConn = WebsocketMocks.getConnectionStub();
      newConn.runRequest("add", "_");
      conn1
        .awaitMessage("d.high")
        .then((data) => fail("Data was sent to a closed connection " + data));
      await newConn.awaitMessage("m.add");
    });
  });

  describe("filtered subscription", () => {
    let conn1 = WebsocketMocks.getConnectionStub();
    let conn2 = WebsocketMocks.getConnectionStub();
    beforeEach(() => {
      conn1 = WebsocketMocks.getConnectionStub();
      conn2 = WebsocketMocks.getConnectionStub();
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
      const out1 = new WebsocketOutbound("f.high", {
        target: target.prototype,
        propertyKey: "outbound",
      });
      out1.subscribeChanges(new filter());
      WebsocketOutbounds.addOutbound(out1);
      const out2 = new WebsocketOutbound("f.low", {
        target: target.prototype,
        propertyKey: "outbound",
      });
      out2.subscribeChanges(new filter());
      WebsocketOutbounds.addOutbound(out2);

      const route = new WebsocketRoute("fadd", {
        target: target.prototype,
        propertyKey: "addEntry",
      });
      route.modifies(["f.high", "f.low"], new filter());
      WebsocketRouter.registerRoute(route);

      // reset data before each test run
      if ((target.prototype as any).___data?._obj?.data) {
        (target.prototype as any).___data._obj.data = new Map();
      }
    });

    it("should re-send high-priority data to subscribed connections matching the filter", async () => {
      expect(
        await Promise.all([
          conn1.awaitMessage("f.high"),
          conn2.awaitMessage("f.high"),
        ])
      ).toStrictEqual([[], []]);
      conn1.runRequest("fadd", "new");
      conn2.awaitMessage("f.high").then(() => {
        fail("The second connection should not recieve updated data");
      });
      expect(await conn1.awaitMessage("f.high")).toStrictEqual(["new"]);
      await conn1.awaitMessage("m.fadd");
    });
    it("should re-send low-priority data to subscribed connections matching the filter", async () => {
      expect(
        await Promise.all([
          conn1.awaitMessage("f.low"),
          conn2.awaitMessage("f.low"),
        ])
      ).toStrictEqual([[], []]);
      conn1.runRequest("fadd", "new");
      conn2.awaitMessage("f.low").then(() => {
        fail("The second connection should not recieve updated data");
      });
      await conn1.awaitMessage("m.fadd");
      expect(await conn1.awaitMessage("f.low")).toStrictEqual(["new"]);
    });
    it("should cancel subscription once the client closes the connection", async () => {
      expect(await conn1.awaitMessage("f.low")).toHaveLength(0);
      conn1.closeConnection();

      conn1.runRequest("fadd", "_");
      conn1
        .awaitMessage("f.low")
        .then((data) => fail("Data was sent to a closed connection " + data));
    });
  });
});

describe("after-auth resend testing", () => {
  it.todo("should be possible to manually trigger auth resend");
  it.todo("should resend data after calling a route with resendAuth tag");
});
