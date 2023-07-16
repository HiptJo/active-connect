import {
  Auth,
  LazyLoading,
  Modifies,
  Outbound,
  Route,
  StandaloneRoute,
  Subscribe,
} from "../../../src/active-connect";
import { WebsocketAuthenticator } from "../../../src/server/websocket/auth/authenticator";
import { WebsocketConnection } from "../../../src/server/websocket/connection/connection";
import { WebsocketRouter } from "../../../src/server/websocket/routing/router";
import { WebsocketMocks } from "../../server/websocket-mocks";

class Authenticator extends WebsocketAuthenticator {
  public readonly label: string = "test-auth";
  public unauthenticatedMessage: string = "error message";
  public async authenticate(conn: WebsocketConnection): Promise<boolean> {
    return true;
  }
}
class FalseAuthenticator extends WebsocketAuthenticator {
  public readonly label: string = "test-auth";
  public unauthenticatedMessage: string = "error message";
  public async authenticate(conn: WebsocketConnection): Promise<boolean> {
    return false;
  }
}

it("should be possible to use authenticators for methods", async () => {
  @Route("auth1")
  class Testing {
    @Route("m1")
    @Auth(new Authenticator())
    method1() {
      return 1;
    }

    @Auth(new Authenticator())
    @Route("m2")
    method2() {
      return 2;
    }
  }
  expect(Testing).toBeDefined();

  const base = WebsocketRouter.Routes.filter((r) => r.Method == "auth1");
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(2);

  const conn = WebsocketMocks.getConnectionStub();
  conn.runRequest("auth1.m1", null);
  const data1 = await conn.expectMethod("m.auth1.m1");
  conn.runRequest("auth1.m2", null);
  const data2 = await conn.expectMethod("m.auth1.m2");

  expect(data1).toBe(1);
  expect(data2).toBe(2);
});

it("should recejt a unauthorized request", async () => {
  @Route("auth2")
  class Testing {
    @Auth(new FalseAuthenticator())
    @Route("m1")
    method1() {
      return 1;
    }

    @Route("m2")
    @Auth(new FalseAuthenticator())
    method2() {
      return 2;
    }
  }
  expect(Testing).toBeDefined();

  const base = WebsocketRouter.Routes.filter((r) => r.Method == "auth2");
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(2);

  const conn = WebsocketMocks.getConnectionStub();

  conn.runRequest("auth2.m2", null);
  const data1 = await conn.expectMethod("m.error");
  expect(data1).toBe("error message");

  conn.runRequest("auth2.m1", null);
  const data2 = await conn.expectMethod("m.error");
  expect(data2).toBe("error message");
});

it("should be possible to use authenticators for outbounds (out decorator first)", async () => {
  class Out {
    @Outbound("out.example1")
    @Auth(new Authenticator())
    async send() {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  const data = await conn.expectMethod("out.example1");
  expect(data).toStrictEqual({ value: "anything" });
});
it("should be possible to use authenticators for outbounds (auth decorator first)", async () => {
  class Out {
    @Auth(new Authenticator())
    @Outbound("out.example2")
    async send() {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  const data = await conn.expectMethod("out.example1");
  expect(data).toStrictEqual({ value: "anything" });
});
it("should not send an error message when outbound authentication fails (out decorator first)", async () => {
  class Out {
    @Outbound("out.example3")
    @Auth(new FalseAuthenticator())
    async send() {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  conn.dontExpectMethod("out.example3");
});
it("should not send an error message when outbound authentication fails (auth decorator first)", async () => {
  class Out {
    @Auth(new FalseAuthenticator())
    @Outbound("out.example4")
    async send() {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  conn.dontExpectMethod("out.example4");
});

it("should be possible to use authenticators for requestable outbounds (out decorator first)", async () => {
  class Out {
    @Outbound("out.example5")
    @LazyLoading
    @Auth(new Authenticator())
    async send(conn: WebsocketConnection) {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();
  conn.runRequest("request.out.example5", null);
  const data = await conn.expectMethod("out.example5");
  expect(data).toStrictEqual({ value: "anything" });
});
it("should be possible to use authenticators for requestable outbounds (auth decorator first)", async () => {
  class Out {
    @Auth(new Authenticator())
    @Outbound("out.example6")
    @LazyLoading
    async send(conn: WebsocketConnection) {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();
  conn.runRequest("request.out.example6", null);
  const data = await conn.expectMethod("out.example6");
  expect(data).toStrictEqual({ value: "anything" });
});
it("should send an error when authenticator for requestable outbounds fails (out decorator first)", async () => {
  class Out {
    @Outbound("out.example7")
    @LazyLoading
    @Auth(new FalseAuthenticator())
    async send(conn: WebsocketConnection) {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();
  conn.runRequest("request.out.example7", null);
  expect(await conn.expectMethod("m.error")).toBe("error message");
});
it("should send an error when authenticator for requestable outbounds fails (auth decorator first)", async () => {
  class Out {
    @Auth(new FalseAuthenticator())
    @LazyLoading
    @Outbound("out.example8")
    async send(conn: WebsocketConnection) {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();
  conn.runRequest("request.out.example8", null);
  expect(await conn.expectMethod("m.error")).toBe("error message");
});

it("should be possible to access the `this` object within a authenticated route (auth first)", async () => {
  @Route("parent1")
  class Testing {
    public data: any = { value: "accessible data" };

    @Auth(new Authenticator())
    @Route("child")
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();

  conn.runRequest("parent1.child", null);
  const data = await conn.expectMethod("m.parent1.child");
  expect(data).toStrictEqual({ value: "accessible data" });
});
it("should be possible to access the `this` object within a authenticated route (route first)", async () => {
  @Route("parent2")
  class Testing {
    public data: any = { value: "accessible data" };

    @Route("child")
    @Auth(new Authenticator())
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();

  conn.runRequest("parent2.child", null);
  const data = await conn.expectMethod("m.parent2.child");
  expect(data).toStrictEqual({ value: "accessible data" });
});
it("should be possible to access the `this` object within a authenticated standalone route (auth first)", async () => {
  const original = { value: "accessible data" };
  class Testing {
    public data: any = original;

    @Auth(new Authenticator())
    @StandaloneRoute("standalone.route1")
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();
  conn.runRequest("standalone.route1", null);
  const data = await conn.expectMethod("m.standalone.route1");
  expect(data).toStrictEqual(original);
});
it("should be possible to access the `this` object within a authenticated standalone route (route first)", async () => {
  const original = { value: "accessible data" };
  class Testing {
    public data: any = original;

    @StandaloneRoute("standalone.route2")
    @Auth(new Authenticator())
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();
  conn.runRequest("standalone.route2", null);
  const data = await conn.expectMethod("m.standalone.route2");
  expect(data).toStrictEqual(original);
});
it("should be possible to access the `this` object within a authenticated outbound (auth first)", async () => {
  class Out {
    private content: any = { content: "something" };

    @Auth(new Authenticator())
    @Outbound("out.example9")
    async send() {
      return this.content;
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();
  const data = await conn.expectMethod("out.example9");
  expect(data).toStrictEqual({ content: "something" });
});
it("should be possible to access the `this` object within a authenticated outbound (out first)", async () => {
  class Out {
    private content: any = { content: "something" };

    @Outbound("out.example10")
    @Auth(new Authenticator())
    async send() {
      return this.content;
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  const data = await conn.expectMethod("out.example10");
  expect(data).toStrictEqual({ content: "something" });
});

it("should raise an error when two authenticators are present for one route", async () => {
  expect(() => {
    class Out {
      private content: any = { content: "something" };

      @Outbound("out.example11")
      @Auth(new Authenticator())
      @Auth(new Authenticator())
      async send() {
        return this.content;
      }
    }
    expect(Out).toBeDefined();
  }).toThrow(
    "Error for config (function label: send): Can not define authentication as another authenticator is already present."
  );
});
it("should be possible to daisy-chain (and/or) authenticators using annotations", async () => {
  class Out {
    @Outbound("out.example12")
    @Auth(new Authenticator().and(new FalseAuthenticator()))
    async unauthorized() {
      return "";
    }
    @Outbound("out.example13")
    @Auth(new Authenticator().or(new FalseAuthenticator()))
    async authorized() {
      return "";
    }
  }
  expect(Out).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();
  conn.dontExpectMethod("out.example12");
  await conn.expectMethod("out.example13");
});

it("should subscribe for changes after outbound has been sent", async () => {
  class Out {
    @Outbound("out.example14")
    @Subscribe
    @Auth(new Authenticator())
    async authorized() {
      return true;
    }

    @StandaloneRoute("update.example14")
    @Modifies("out.example14")
    async update() {}
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();
  await conn.expectMethod("out.example14");
  conn.runRequest("update.example14", null);
  await conn.expectMethod("out.example14");
});
it("should not subscribe for changes when no outbound is sent", async () => {
  class Out {
    @Outbound("out.example15")
    @Subscribe
    @Auth(new FalseAuthenticator())
    async authorized() {
      return true;
    }

    @StandaloneRoute("update.example15")
    @Modifies("out.example15")
    async update() {}
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();
  conn.runRequest("update.example15", null);
  conn.dontExpectMethod("out.example15");
  await conn.expectMethod("m.update.example15");
});
it("should trigger outbound updating when route request is auth", async () => {
  class Out {
    @Outbound("out.example16")
    @Subscribe
    async authorized() {
      return true;
    }

    @StandaloneRoute("update.example16")
    @Modifies("out.example16")
    @Auth(new Authenticator())
    async update() {}
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();
  await conn.expectMethod("out.example16");
  conn.runRequest("update.example16", null);
  await conn.expectMethod("out.example16");
});
it("should not trigger outbound updating when route request is unauth", async () => {
  class Out {
    @Outbound("out.example17")
    @Subscribe
    async authorized() {
      return true;
    }

    @StandaloneRoute("update.example17")
    @Modifies("out.example17")
    @Auth(new FalseAuthenticator())
    async update() {}
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();
  await conn.expectMethod("out.example17");
  conn.runRequest("update.example17", null);
  conn.dontExpectMethod("out.example17");
  conn.dontExpectMethod("m.update.example17");
  await conn.expectMethod("m.error");
});

it("should raise an error when multiple or authenticators are added", async () => {
  expect(() => {
    class Testing {
      @StandaloneRoute("standalone.route3")
      @Auth(new Authenticator().or(new Authenticator()).or(new Authenticator()))
      route() {}
    }
    expect(Testing).toBeDefined();
  }).toThrow("Or authenticator is already defined");
});
it("should raise an error when multiple and authenticators are added", async () => {
  expect(() => {
    class Testing {
      @StandaloneRoute("standalone.route4")
      @Auth(
        new Authenticator().and(new Authenticator()).and(new Authenticator())
      )
      route() {}
    }
    expect(Testing).toBeDefined();
  }).toThrow("And authenticator is already defined");
});

it("should raise an error when an and authenticator is added and an or authenticators exists already", async () => {
  expect(() => {
    class Testing {
      @StandaloneRoute("standalone.route3")
      @Auth(
        new Authenticator().or(new Authenticator()).and(new Authenticator())
      )
      route() {}
    }
    expect(Testing).toBeDefined();
  }).toThrow("Or authenticator is already defined");
});
it("should raise an error when an or authenticator is added and an and authenticators exists already", async () => {
  expect(() => {
    class Testing {
      @StandaloneRoute("standalone.route4")
      @Auth(
        new Authenticator().and(new Authenticator()).or(new Authenticator())
      )
      route() {}
    }
    expect(Testing).toBeDefined();
  }).toThrow("And authenticator is already defined");
});
