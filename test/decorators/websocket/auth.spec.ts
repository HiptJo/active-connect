import {
  Auth,
  LazyLoading,
  Outbound,
  Route,
  StandaloneRoute,
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
  const data1 = await conn.awaitMessage("m.auth1.m1");
  conn.runRequest("auth1.m2", null);
  const data2 = await conn.awaitMessage("m.auth1.m2");

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
  const data1 = await conn.awaitMessage("m.error");
  expect(data1).toBe("error message");

  conn.runRequest("auth2.m1", null);
  const data2 = await conn.awaitMessage("m.error");
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

  const data = await conn.awaitMessage("out.example1");
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

  const data = await conn.awaitMessage("out.example1");
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

  conn.awaitMessage("out.example3").then(() => {
    fail(
      "received data even though the authenticator does not authenticate this request"
    );
  });
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

  conn.awaitMessage("out.example4").then(() => {
    fail(
      "received data even though the authenticator does not authenticate this request"
    );
  });
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
  const data = await conn.awaitMessage("out.example5");
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
  const data = await conn.awaitMessage("out.example6");
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
  expect(await conn.awaitMessage("m.error")).toBe("error message");
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
  expect(await conn.awaitMessage("m.error")).toBe("error message");
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
  const data = await conn.awaitMessage("m.parent1.child");
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
  const data = await conn.awaitMessage("m.parent2.child");
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
  const data = await conn.awaitMessage("m.standalone.route1");
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
  const data = await conn.awaitMessage("m.standalone.route2");
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
  const data = await conn.awaitMessage("out.example9");
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

  const data = await conn.awaitMessage("out.example10");
  expect(data).toStrictEqual({ content: "something" });
});

/* @todo */
it.todo("should subscribe for changes after outbound has been sent");
it.todo("should not subscribe for changes when no outbound is sent");
it.todo("should trigger outbound updating when route request is auth");
it.todo("should not trigger outbound updating when route request is unauth");
