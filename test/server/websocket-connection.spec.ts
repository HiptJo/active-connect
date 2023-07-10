import { StubWebsocketConnection, WebsocketMocks } from "./websocket-mocks";
import * as assert from "assert";

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
    conn
      .awaitMessage<{ value: string }>("message.testing")
      .then((data: { value: string }) => {
        assert.strictEqual(data, value);
        d();
      });
    conn.send("message.testing", value);
  });
  it("should be possible to send false", (d) => {
    const value = false;
    conn
      .awaitMessage<{ value: string }>("message.testing")
      .then((data: { value: string }) => {
        assert.strictEqual(data, value);
        d();
      });
    conn.send("message.testing", value);
  });
  it("should be possible to await sent data", async () => {
    const value = { value: "i am okay" };

    conn.send("message.testing", value);

    const data = await conn.awaitMessage<{ value: string }>("message.testing");
    expect(data).toStrictEqual(value);
  });
});

it.todo(
  "should invoke methods decorated with @OnWebsocketConnectionClosed after closing the websocket connection (multiple decorators should be supported)"
);

it.todo("should send a ping message to the client every 45 seconds");
it.todo("should raise an error when a message without message-id is received");
