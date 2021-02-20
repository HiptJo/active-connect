import { Auth, Route } from "../../../src/active-connect";
import { WebsocketAuthenticator } from "../../../src/server/websocket/auth/authenticator";
import { WebsocketConnection } from "../../../src/server/websocket/connection/connection";
import { WebsocketRequest } from "../../../src/server/websocket/message/request";
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
  expect(data).toBe("auth:unauthorized:test-auth");
});