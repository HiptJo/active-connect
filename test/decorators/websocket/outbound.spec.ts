import { Outbound, Shared } from "../../../src/active-connect";
import { WebsocketConnection } from "../../../src/server/websocket/connection/connection";
import { WebsocketRequest } from "../../../src/server/websocket/message/request";
import { WebsocketOutbounds } from "../../../src/server/websocket/routing/outbound";
import { WebsocketRouter } from "../../../src/server/websocket/routing/router";
import { WebsocketMocks } from "../../server/websocket-mocks";

it("should be possible to create a outbound", async () => {
  class Out {
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

it("should be possible to create a requestable outbound", async () => {
  class Out {
    @Outbound("out.requesting", true)
    async send(conn: WebsocketConnection) {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendSingleOutboundByMethod("out.requesting", conn);

  const data = await conn.awaitMessage("out.example");
  expect(data).toStrictEqual({ value: "anything" });
});

it("should be possible to access the `this` object within a outbound", async () => {
  class Out {
    @Shared({ content: "something" }) private content: any;

    @Outbound("out.this")
    async send() {
      return this.content;
    }
  }
  expect(Out).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendToConnection(conn);

  const data = await conn.awaitMessage("out.this");
  expect(data).toStrictEqual({ content: "something" });
});

it("should be possible to create multiple outbounds", async () => {
  class Out {
    @Outbound("outm.1")
    async sendA() {
      return 1;
    }
    @Outbound("outm.2")
    async sendB() {
      return 2;
    }
  }
  expect(Out).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendToConnection(conn);

  const data = await conn.awaitMessage("outm.1");
  expect(data).toStrictEqual(1);
  const data1 = await conn.awaitMessage("outm.2");
  expect(data1).toStrictEqual(2);
});

describe("error management", () => {
  it("should send a m.error when a route throws an string", async () => {
    class Testing {
      @Outbound("throws.error.1", true)
      func() {
        throw Error("I am an error1");
      }
    }
    expect(Testing).toBeDefined();
    const conn = WebsocketMocks.getConnectionStub();
    try {
      await WebsocketOutbounds.sendSingleOutboundByMethod(
        "throws.error.1",
        conn
      );
      expect(await conn.awaitMessage("m.error")).toBe("I am an error1");
    } catch (e) {}
  });
});

it("should be possible to request a outbound using the requesting method", async () => {
  // @injectAttributes
  class Testing {
    @Outbound("test.requesting.out", true)
    async send() {
      return "data";
    }
  }
  new Testing();
  expect(Testing).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();
  new WebsocketRouter().route(
    new WebsocketRequest("request.test.requesting.out", null, conn)
  );
  const res = await conn.awaitMessage("test.requesting.out");
  expect(res).toBe("data");
});
