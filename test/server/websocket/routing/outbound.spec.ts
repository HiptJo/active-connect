import {
  MessageFilter,
  WebsocketAuthenticator,
  WebsocketConnection,
  WebsocketRoute,
  WebsocketRouter,
} from "../../../../src";
import { StubWebsocketConnection } from "../../../../src/integration-testing";
import { testEach } from "../../../../src/jest";
import { WebsocketOutbound, WebsocketOutbounds } from "../../../../src/";
import { WebsocketMocks } from "../../websocket-mocks";

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

beforeAll(() => {
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

it("should be possible to get all outbounds", async () => {
  expect(WebsocketOutbounds.getAllOutbounds()).toBeDefined();
  expect(
    WebsocketOutbounds.getAllOutbounds().filter((o) => o.method == "data")
  ).toHaveLength(1);
});

describe("default outbound", () => {
  it("should be possible to create a new outbound", () => {
    const outbound = new WebsocketOutbound("testing.delivery1", {
      target: target.prototype,
      propertyKey: "out",
    });
    expect(outbound).toBeDefined();
    WebsocketOutbounds.addOutbound(outbound);
    expect(WebsocketOutbounds.getOutbound("testing.delivery1")).toBe(outbound);
  });
  it("should be possible to send a outbound", async () => {
    const outbound = new WebsocketOutbound("testing.delivery2", {
      target: target.prototype,
      propertyKey: "out",
    });

    WebsocketOutbounds.addOutbound(outbound);

    const conn = WebsocketMocks.getConnectionStub();

    const data: any = await conn.expectMethod("testing.delivery2");
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
  it("should not send lazy-loaded data without requesting it", async () => {
    WebsocketOutbounds.addOutbound(
      new WebsocketOutbound(
        "testing.requestable1",
        { target: target.prototype, propertyKey: "requestable" },
        true
      )
    );
    const conn = WebsocketMocks.getConnectionStub();
    conn.dontExpectMethod("testing.requestable1");
  });

  it("should be possible to receive a requesting outbound", async () => {
    WebsocketOutbounds.addOutbound(
      new WebsocketOutbound(
        "testing.requestable2",
        { target: target.prototype, propertyKey: "requestable" },
        true
      )
    );
    const conn = WebsocketMocks.getConnectionStub();
    conn.runRequest("request.testing.requestable2", null);
    const data: any = await conn.expectMethod("testing.requestable2");
    expect(data.value).toBe("ok-requested");
  });
});

describe("error handling", () => {
  class target {
    async outbound1() {
      throw Error("...");
    }
    async outbound2() {
      throw "...";
    }
  }

  describe("handle exceptions thrown inside methods", () => {
    testEach<string>(["outbound1", "outbound2"], [], (propertyKey: string) => {
      beforeEach(() => {
        WebsocketOutbounds.removeOutboundByMethod("d.out");
        WebsocketOutbounds.addOutbound(
          new WebsocketOutbound("d.out", {
            target: target.prototype,
            propertyKey,
          })
        );
      });
      afterEach(() => {
        WebsocketOutbounds.removeOutboundByMethod("d.out");
      });

      it(
        "should send m.error when a error is thrown inside the outbound method: " +
          propertyKey,
        async () => {
          const conn = WebsocketMocks.getConnectionStub();
          expect(await conn.expectMethod("m.error")).toBe("...");
        }
      );
    });
  });

  it("should throw when updates should be sent for a non-existing outbound method", async () => {
    await expect(
      WebsocketOutbounds.sendUpdates(["unknown.method"])
    ).rejects.toThrow(
      'Websocket: Can not send updates to outbound "unknown.method". Please ensure, that the method exists and subscriptions are enabled.'
    );
  });
});

describe("subscription testing", () => {
  describe("default subscription", () => {
    class target {
      data: string[] = [];
      outbound() {
        return this.data;
      }
      async addEntry(content: string) {
        this.data.push(content);
      }
    }

    beforeAll(() => {
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
    });
    beforeEach(() => {
      // reset data before each test run
      if ((target.prototype as any).___data?._obj?.data) {
        (target.prototype as any).___data._obj.data = [];
      }
    });

    it("should re-send high-priority data to subscribed connections", async () => {
      let conn1 = WebsocketMocks.getConnectionStub();
      let conn2 = WebsocketMocks.getConnectionStub();
      expect(
        await Promise.all([
          conn1.expectMethod("d.high"),
          conn2.expectMethod("d.high"),
        ])
      ).toStrictEqual([[], []]);
      conn1.runRequest("add", "new");
      expect(
        await Promise.all([
          conn1.expectMethod("m.add"),

          conn1.expectMethod("d.high"),
          conn2.expectMethod("d.high"),
        ])
      ).toStrictEqual([undefined, ["new"], ["new"]]);
    });
    it("should re-send low-priority data to subscribed connections", async () => {
      let conn1 = WebsocketMocks.getConnectionStub();
      let conn2 = WebsocketMocks.getConnectionStub();
      expect(
        await Promise.all([
          conn1.expectMethod("d.low"),
          conn2.expectMethod("d.low"),
        ])
      ).toStrictEqual([[], []]);
      conn1.runRequest("add", "new");
      expect(
        await Promise.all([
          conn1.expectMethod("d.low"),
          conn2.expectMethod("d.low"),
        ])
      ).toStrictEqual([["new"], ["new"]]);
    });
    it("should cancel subscription once the client closes the connection", async () => {
      let conn1 = WebsocketMocks.getConnectionStub();
      expect(await conn1.expectMethod("d.high")).toHaveLength(0);
      conn1.closeConnection();

      const newConn = WebsocketMocks.getConnectionStub();
      newConn.runRequest("add", "_");
      conn1.dontExpectMethod("d.high");
      await newConn.expectMethod("m.add");
    });

    it("should be possible to send a message to subscribing clients", async () => {
      var conn1 = WebsocketMocks.getConnectionStub();
      expect(await conn1.expectMethod("d.high"));
      var conn2 = WebsocketMocks.getConnectionStub();
      expect(await conn2.expectMethod("d.high"));

      WebsocketOutbounds.sendMessageToSubscribingConnections(
        "d.high",
        "MANUAL_SENT_DATA",
        "data"
      );
      expect(
        await Promise.all([
          conn1.expectMethod("MANUAL_SENT_DATA"),
          conn2.expectMethod("MANUAL_SENT_DATA"),
        ])
      ).toStrictEqual(["data", "data"]);
    });
  });

  describe("filtered subscription", () => {
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

    beforeAll(() => {
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
    });
    beforeEach(() => {
      // reset data before each test run
      if ((target.prototype as any).___data?._obj?.data) {
        (target.prototype as any).___data._obj.data = new Map();
      }
    });

    it("should re-send high-priority data to subscribed connections matching the filter", async () => {
      let conn1 = WebsocketMocks.getConnectionStub();
      let conn2 = WebsocketMocks.getConnectionStub();
      expect(
        await Promise.all([
          conn1.expectMethod("f.high"),
          conn2.expectMethod("f.high"),
        ])
      ).toStrictEqual([[], []]);

      conn2.dontExpectMethod("f.high");
      conn1.runRequest("fadd", "new");

      expect(
        (
          await Promise.all([
            conn1.expectMethod("f.high"),
            conn1.expectMethod("m.fadd"),
          ])
        )[0]
      ).toStrictEqual(["new"]);
    });
    it("should re-send low-priority data to subscribed connections matching the filter", async () => {
      let conn1 = WebsocketMocks.getConnectionStub();
      let conn2 = WebsocketMocks.getConnectionStub();
      expect(
        await Promise.all([
          conn1.expectMethod("f.low"),
          conn2.expectMethod("f.low"),
        ])
      ).toStrictEqual([[], []]);
      conn1.runRequest("fadd", "new");
      conn2.dontExpectMethod("f.low");
      expect(
        (
          await Promise.all([
            conn1.expectMethod("f.low"),
            conn1.expectMethod("m.fadd"),
          ])
        )[0]
      ).toStrictEqual(["new"]);
    });
    it("should cancel subscription once the client closes the connection", async () => {
      let conn1 = WebsocketMocks.getConnectionStub();
      expect(await conn1.expectMethod("f.low")).toHaveLength(0);
      conn1.closeConnection();

      conn1.runRequest("fadd", "_");
      conn1.dontExpectMethod("f.low");
    });

    it("should be possible to send a message to subscribing clients", async () => {
      var conn1 = WebsocketMocks.getConnectionStub();
      expect(await conn1.expectMethod("f.high"));

      WebsocketOutbounds.sendMessageToSubscribingConnections(
        "f.high",
        "MANUAL_SENT_DATA",
        "data",
        conn1.identifier
      );
      expect(await conn1.expectMethod("MANUAL_SENT_DATA")).toBe("data");
    });
  });
});

describe("after-auth resend testing", () => {
  class target {
    data = 1;
    outbound() {
      return this.data;
    }
    async authenticate() {
      this.data++;
      return true;
    }
  }

  beforeAll(() => {
    const out1 = new WebsocketOutbound(
      "a.id1",
      {
        target: target.prototype,
        propertyKey: "outbound",
      },
      false,
      true
    );
    WebsocketOutbounds.addOutbound(out1);

    const out2 = new WebsocketOutbound(
      "a.id2",
      {
        target: target.prototype,
        propertyKey: "outbound",
      },
      true,
      true
    );
    WebsocketOutbounds.addOutbound(out2);

    const route = new WebsocketRoute(
      "auth",
      {
        target: target.prototype,
        propertyKey: "authenticate",
      },
      true
    );
    WebsocketRouter.registerRoute(route);
  });
  beforeEach(() => {
    // reset data before each test run
    if ((target.prototype as any).___data?._obj?.data) {
      (target.prototype as any).___data._obj.data = 1;
    }
  });

  it("should be possible to manually trigger auth resend", async () => {
    let conn = WebsocketMocks.getConnectionStub();

    expect(await conn.expectMethod("a.id1")).toBe(1);

    WebsocketOutbounds.resendDataAfterAuth(conn).then();

    expect(await conn.expectMethod("a.id1")).toBe(1);
  });
  it("should resend eager-loaded data after calling a route with resendAuth tag", async () => {
    let conn = WebsocketMocks.getConnectionStub();

    expect(await conn.expectMethod("a.id1")).toBe(1);

    conn.runRequest("auth", null);
    expect(
      await Promise.all([
        conn.expectMethod("a.id1"),
        conn.expectMethod("m.auth"),
      ])
    ).toStrictEqual([2, true]);
  });
  it("should resend lazy-loaded data if the client is subscribed after calling a route with resendAuth tag", async () => {
    const conn1 = WebsocketMocks.getConnectionStub();
    conn1.runRequest("request.a.id2", null);
    await conn1.expectMethod("a.id2");
    conn1.dontExpectMethod("a.id2");

    let conn = WebsocketMocks.getConnectionStub();
    conn.runRequest("request.a.id2", null);
    expect(await conn.expectMethod("a.id2")).toBe(1);

    conn.runRequest("auth", null);
    expect(
      await Promise.all([
        conn.expectMethod("a.id2"),
        conn.expectMethod("m.auth"),
      ])
    ).toStrictEqual([2, true]);
  });
  it("should not resend lazy-loaded data if the client is not subscribed to it after calling a route with resendAuth tag", async () => {
    let conn = WebsocketMocks.getConnectionStub();

    conn.runRequest("auth", null);
    expect(await conn.expectMethod("m.auth")).toBeTruthy();
    conn.dontExpectMethod("a.id2");
  });
});

describe("authentication", () => {
  const UNAUTH = "not-authenticated";

  class Authenticator extends WebsocketAuthenticator {
    public label: string;
    constructor(public grantPermission: boolean) {
      super();
      if (grantPermission) {
        this.label = "granted";
      } else {
        this.label = "rejected";
      }
    }

    public unauthenticatedMessage: string = UNAUTH;
    public async authenticate(
      conn: string | WebsocketConnection,
      requestData: null
    ): Promise<boolean> {
      expect(conn).toBeDefined();
      expect(conn).toBeInstanceOf(WebsocketConnection);
      expect((conn as WebsocketConnection).id).toBeGreaterThanOrEqual(0);
      expect(requestData).toBeNull();
      return this.grantPermission;
    }
  }

  it("should be possible to create a authenticated outbound", async () => {
    class target {
      out() {
        return "";
      }
    }
    const out = new WebsocketOutbound("auth.out1", {
      target: target.prototype,
      propertyKey: "out",
    });
    out.setAuthenticator(new Authenticator(true));
    WebsocketOutbounds.addOutbound(out);
  });

  describe("authentication checks", () => {
    class target1 {
      static data = "data";
      granted() {
        return target1.data;
      }
      denied() {
        fail(
          "The denied method was called, even though the request must not pass the authentication step"
        );
      }
    }

    beforeAll(() => {
      const out2 = new WebsocketOutbound("auth.out2", {
        target: target1.prototype,
        propertyKey: "granted",
      });
      out2.setAuthenticator(new Authenticator(true));
      WebsocketOutbounds.addOutbound(out2);

      const out3 = new WebsocketOutbound("auth.out3", {
        target: target1.prototype,
        propertyKey: "denied",
      });
      out3.setAuthenticator(new Authenticator(false));
      WebsocketOutbounds.addOutbound(out3);

      const out4 = new WebsocketOutbound(
        "auth.out4",
        {
          target: target1.prototype,
          propertyKey: "granted",
        },
        true
      );
      out4.setAuthenticator(new Authenticator(true));
      WebsocketOutbounds.addOutbound(out4);

      const out5 = new WebsocketOutbound(
        "auth.out5",
        {
          target: target1.prototype,
          propertyKey: "denied",
        },
        true
      );
      out5.setAuthenticator(new Authenticator(false));
      WebsocketOutbounds.addOutbound(out5);

      const out6 = new WebsocketOutbound("auth.out6", {
        target: target1.prototype,
        propertyKey: "granted",
      });
      var auth = new Authenticator(true);
      auth.or(new Authenticator(false));
      out6.setAuthenticator(auth);
      WebsocketOutbounds.addOutbound(out6);

      const out7 = new WebsocketOutbound("auth.out7", {
        target: target1.prototype,
        propertyKey: "denied",
      });
      auth = new Authenticator(true);
      auth.and(new Authenticator(false).or(new Authenticator(false)));
      out7.setAuthenticator(auth);
      WebsocketOutbounds.addOutbound(out7);

      const out8 = new WebsocketOutbound(
        "auth.out8",
        {
          target: target1.prototype,
          propertyKey: "granted",
        },
        true
      );
      auth = new Authenticator(true);
      auth.and(new Authenticator(false).or(new Authenticator(true)));
      out8.setAuthenticator(auth);
      WebsocketOutbounds.addOutbound(out8);

      const out9 = new WebsocketOutbound(
        "auth.out9",
        {
          target: target1.prototype,
          propertyKey: "denied",
        },
        true
      );
      auth = new Authenticator(false);
      auth.and(new Authenticator(true).or(new Authenticator(true)));
      out9.setAuthenticator(auth);
      WebsocketOutbounds.addOutbound(out9);
    });

    it("should send authenticated outbound on connect (eager-loading, access granted)", async () => {
      const conn = WebsocketMocks.getConnectionStub();
      expect(await conn.expectMethod("auth.out2")).toBe(target1.data);
    });
    it("should not send authenticated outbound on connect (eager-loading, access denied)", async () => {
      const conn = WebsocketMocks.getConnectionStub();
      conn.dontExpectMethod("auth.out3");
    });
    it("should be possible to request an outbound (lazy-loading, access granted)", async () => {
      const conn = WebsocketMocks.getConnectionStub();
      conn.runRequest("request.auth.out4", null);
      expect(await conn.expectMethod("auth.out4")).toBe(target1.data);
    });
    it("should not be possible to request an outbound (lazy-loading, access denied)", async () => {
      const conn = WebsocketMocks.getConnectionStub();
      conn.runRequest("request.auth.out5", null);
      expect(await conn.expectMethod("m.error")).toBe("not-authenticated");
      conn.dontExpectMethod("auth.out5");
    });

    it("should be possible to daisy-chain authenticators (eager-loading, access granted)", async () => {
      const conn = WebsocketMocks.getConnectionStub();
      expect(await conn.expectMethod("auth.out6")).toBe(target1.data);
    });
    it("should be possible to daisy-chain authenticators (eager-loading, access denied)", async () => {
      const conn = WebsocketMocks.getConnectionStub();
      conn.dontExpectMethod("auth.out7");
    });
    it("should be possible to daisy-chain authenticators (lazy-loading, access granted)", async () => {
      const conn = WebsocketMocks.getConnectionStub();
      conn.runRequest("request.auth.out8", null);
      expect(await conn.expectMethod("auth.out8")).toBe(target1.data);
    });
    /*it("should be possible to daisy-chain authenticators (lazy-loading, access denied)", async () => {
      const conn = WebsocketMocks.getConnectionStub();
      conn.runRequest("request.auth.out9", null);
      expect(await conn.expectMethod("m.error")).toBe("not-authenticated");
      conn.dontExpectMethod("auth.out9");
    }); @todo*/
  });
});
