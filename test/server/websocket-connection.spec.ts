import { StandaloneRoute } from "../../src";
import { StubWebsocketConnection } from "../../src/integration-testing";
import { WebsocketMocks } from "./websocket-mocks";

it("should be possible to create a new WebsocketConnection mock", () => {
  WebsocketMocks.getConnectionStub();
});
describe("connection testing (stub)", () => {
  let conn: StubWebsocketConnection;
  beforeEach(() => {
    conn = WebsocketMocks.getConnectionStub();
  });

  it("should be possible to send data", (d) => {
    const value = { value: "i am okay" };
    conn.expectMethod("message.testing").then((data: { value: string }) => {
      expect(data).toEqual(value);
      d();
    });
    conn.send("message.testing", value);
  });
  it("should be possible to send false", (d) => {
    const value = false;
    conn.expectMethod("message.testing").then((data: { value: string }) => {
      expect(data).toStrictEqual(value);
      d();
    });
    conn.send("message.testing", value);
  });
  it("should be possible to await sent data", (d) => {
    const value = { value: "i am okay" };
    conn.expectMethod("message.testing").then((data: { value: string }) => {
      expect(data).toStrictEqual(value);
      d();
    });
    conn.send("message.testing", value);
  });
});

it("should raise an error when a message without message-id is received", async () => {
  class Testing {
    @StandaloneRoute("standlone.nomessageid")
    async route() {
      fail("no message id has been provided");
    }
  }
  expect(Testing).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();
  conn.runRequest("standlone.nomessageid", null, true);
  expect(
    ((await conn.expectMethod("m.error")) as string).includes("no messageId")
  );
});
