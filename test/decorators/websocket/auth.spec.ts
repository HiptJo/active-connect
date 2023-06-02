import {
  Auth,
  Modifies,
  Outbound,
  Route,
  Shared,
  StandaloneRoute,
  SubscribeChanges,
} from "../../../src/active-connect";
import { WebsocketAuthenticator } from "../../../src/server/websocket/auth/authenticator";
import { WebsocketConnection } from "../../../src/server/websocket/connection/connection";
import { WebsocketRequest } from "../../../src/server/websocket/message/request";
import { WebsocketOutbounds } from "../../../src/server/websocket/routing/outbound";
import { WebsocketRouter } from "../../../src/server/websocket/routing/router";
import { WebsocketMocks } from "../../server/websocket-mocks";

class Authenticator extends WebsocketAuthenticator {
  public readonly label: string = "test-auth";
  public async authenticate(conn: WebsocketConnection): Promise<boolean> {
    return true;
  }
}
class FalseAuthenticator extends WebsocketAuthenticator {
  public readonly label: string = "test-auth";
  public async authenticate(conn: WebsocketConnection): Promise<boolean> {
    return false;
  }
}

it("should be possible to use authenticators for methods", async () => {
  @Route("testingmultiple1")
  class Testing {
    @Route("m1")
    @Auth(new Authenticator())
    method1(data: any, conn: WebsocketConnection) {
      return 1;
    }

    @Route("m2")
    @Auth(new Authenticator())
    method2(data: any, conn: WebsocketConnection) {
      return 2;
    }
  }
  expect(Testing).toBeDefined();

  const base = WebsocketRouter.Routes.filter(
    (r) => r.Method == "testingmultiple1"
  );
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(2);

  const conn = WebsocketMocks.getConnectionStub();
  const router = new WebsocketRouter();

  await router.route(new WebsocketRequest("testingmultiple1.m2", null, conn));
  await router.route(new WebsocketRequest("testingmultiple1.m1", null, conn));
  const data1 = await conn.awaitMessage("m.testingmultiple1.m1");
  const data2 = await conn.awaitMessage("m.testingmultiple1.m2");

  expect(data1).toBe(1);
  expect(data2).toBe(2);
});

it("should recejt a unauthorized request", async () => {
  @Route("testrj")
  class Testing {
    @Route("m1")
    @Auth(new Authenticator())
    method1(data: any, conn: WebsocketConnection) {
      return 1;
    }

    @Route("m2")
    @Auth(new FalseAuthenticator())
    method2(data: any, conn: WebsocketConnection) {
      return 2;
    }
  }
  expect(Testing).toBeDefined();

  const base = WebsocketRouter.Routes.filter((r) => r.Method == "testrj");
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(2);

  const conn = WebsocketMocks.getConnectionStub();
  const router = new WebsocketRouter();
  await router.route(new WebsocketRequest("testrj.m2", null, conn));
  const data = await conn.awaitMessage("m.error");
  expect(data).toBe(
    "Die Aktion wurde nicht durchgeführt. Haben Sie die notwendigen Berechtigungen? (test-auth)"
  );
});
it("should be possible to use authenticators for outbounds (out decorator first)", async () => {
  class Out {
    @Outbound("out.example1")
    @Auth(new Authenticator())
    async send(conn: WebsocketConnection) {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendToConnection(conn);

  const data = await conn.awaitMessage("out.example1");
  expect(data).toStrictEqual({ value: "anything" });
});
it("should be possible to use authenticators for requestable outbounds (out decorator first)", async () => {
  class Out {
    @Outbound("out.example1.a", true)
    @Auth(new Authenticator())
    @Modifies("xyz.asdf.asldkfasjkldföklas")
    async send(conn: WebsocketConnection) {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendToConnection(conn);
  await new WebsocketRouter().route(
    new WebsocketRequest("request.out.example1.a", null, conn)
  );
  const data = await conn.awaitMessage("out.example1.a");
  expect(data).toStrictEqual({ value: "anything" });
});
it("should be possible to use authenticators for outbounds (auth decorator first)", async () => {
  class Out {
    @Auth(new Authenticator())
    @Outbound("out.example")
    async send(conn: WebsocketConnection) {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendToConnection(conn);

  const data = await conn.awaitMessage("out.example");
  expect(data).toStrictEqual({ value: "anything" });
});

it("should not send unauthorized data to a outbound (auth decorator first)", async () => {
  class Out {
    @Auth(new FalseAuthenticator())
    @Outbound("out.restricted")
    async send(conn: WebsocketConnection) {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendToConnection(conn);

  conn.awaitMessage("out.restricted").then((d) => {
    fail(d);
  });
});
it("should not send unauthorized data to a outbound (out decorator first)", async () => {
  class Out {
    @Outbound("out.restricted1")
    @Auth(new FalseAuthenticator())
    async send(conn: WebsocketConnection) {
      return { value: "anything1" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendToConnection(conn);

  conn.awaitMessage("out.restricted1").then((d) => {
    fail(d);
  });
});

it("should be possible to access the `this` object within a authenticated route (auth first)", async () => {
  const original = { value: "accessible data" };
  @Route("auththischeck1")
  class Testing {
    @Shared(original)
    public data: any;

    @Auth(new Authenticator())
    @Route("child")
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();

  await router.route(new WebsocketRequest("auththischeck1.child", null, conn));
  const data = await conn.awaitMessage("m.auththischeck1.child");
  expect(data).toStrictEqual(original);
});
it("should be possible to access the `this` object within a authenticated route (route first)", async () => {
  const original = { value: "accessible data" };
  @Route("auththischeck2")
  class Testing {
    @Shared(original)
    public data: any;

    @Route("child")
    @Auth(new Authenticator())
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();

  await router.route(new WebsocketRequest("auththischeck2.child", null, conn));
  const data = await conn.awaitMessage("m.auththischeck2.child");
  expect(data).toStrictEqual(original);
});
it("should be possible to access the `this` object within a authenticated standalone route (auth first)", async () => {
  const original = { value: "accessible data" };
  class Testing {
    @Shared(original)
    public data: any;

    @Auth(new Authenticator())
    @StandaloneRoute("check1.standalone")
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();

  await router.route(new WebsocketRequest("check1.standalone", null, conn));
  const data = await conn.awaitMessage("m.check1.standalone");
  expect(data).toStrictEqual(original);
});
it("should be possible to access the `this` object within a authenticated standalone route (route first)", async () => {
  const original = { value: "accessible data" };
  class Testing {
    @Shared(original)
    public data: any;

    @StandaloneRoute("check1.standalone")
    @Auth(new Authenticator())
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();

  await router.route(new WebsocketRequest("check1.standalone", null, conn));
  const data = await conn.awaitMessage("m.check1.standalone");
  expect(data).toStrictEqual(original);
});
it("should be possible to access the `this` object within a authenticated outbound (auth first)", async () => {
  class Out {
    @Shared({ content: "something" }) private content: any;

    @Auth(new Authenticator())
    @Outbound("out.this1")
    async send() {
      return this.content;
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendToConnection(conn);

  const data = await conn.awaitMessage("out.this1");
  expect(data).toStrictEqual({ content: "something" });
});
it("should be possible to access the `this` object within a authenticated outbound (out first)", async () => {
  class Out {
    @Shared({ content: "something" }) private content: any;

    @Outbound("out.this2")
    @Auth(new Authenticator())
    async send() {
      return this.content;
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendToConnection(conn);

  const data = await conn.awaitMessage("out.this2");
  expect(data).toStrictEqual({ content: "something" });
});

it("should not send data for unauthorized user (out decorator first)", async () => {
  class Out {
    @Outbound("outu.example1")
    @Auth(new FalseAuthenticator())
    async send(conn: WebsocketConnection) {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendToConnection(conn);

  conn.awaitMessage("outu.example1").then(fail);
});
it("should not send data for unauthorized user (auth decorator first)", async () => {
  class Out {
    @Auth(new FalseAuthenticator())
    @Outbound("outu.example2")
    async send(conn: WebsocketConnection) {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendToConnection(conn);

  conn.awaitMessage("outu.example2").then(fail);
});

it("should subscribe for changes after unauthorized request (sub first)", async () => {
  class Out {
    @SubscribeChanges
    @Auth(new FalseAuthenticator())
    @Outbound("outu.example3")
    async send() {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendToConnection(conn);

  conn.awaitMessage("outu.example3").then(fail);
});
it("should subscribe for changes after unauthorized request (auth first)", async () => {
  class Out {
    @Auth(new FalseAuthenticator())
    @SubscribeChanges
    @Outbound("outu.example4")
    async send() {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendToConnection(conn);

  conn.awaitMessage("outu.example4").then(fail);
});

it("should be possible to access the request data from a authenticator", async () => {
  class DataAuth extends WebsocketAuthenticator {
    public label: string = "data-auth";
    public async authenticate(
      conn: WebsocketConnection,
      requestData: any
    ): Promise<boolean> {
      expect(requestData).toBe("data-string");
      return true;
    }
  }
  @Route("testauthdata")
  class Testing {
    @Route("d")
    @Auth(new DataAuth())
    method1(data: any, conn: WebsocketConnection) {
      return 1;
    }
  }
  expect(Testing).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();
  const router = new WebsocketRouter();

  await router.route(
    new WebsocketRequest("testauthdata.d", "data-string", conn)
  );
  const data1 = await conn.awaitMessage("m.testauthdata.d");

  expect(data1).toBe(1);
});
