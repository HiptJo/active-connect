import {
  WebsocketAuthenticator,
  WebsocketConnection,
  WebsocketOutbound,
  WebsocketOutbounds,
  WebsocketRouter,
} from "../../../../src";
import { testEach } from "../../../../src/jest";
import { WebsocketRequest } from "../../../../src/server/websocket/message/request";
import {
  WebsocketRoute,
  StandaloneWebsocketRoute,
} from "../../../../src/server/websocket/routing/route";
import { WebsocketMocks } from "../../websocket-mocks";

const conn = new WebsocketConnection(null as any);

describe("default route", () => {
  it("should be possible to create a route", () => {
    class target {
      constructor() {}
      f() {}
    }

    const route = new WebsocketRoute("testing", {
      target: target.prototype,
      propertyKey: "f",
    });
    expect(route).toBeTruthy();
  });
  it("should recect when creating a route containing a .", async () => {
    class target {
      f() {}
    }

    await expect(async () => {
      new WebsocketRoute("testing.fail", {
        target: target.prototype,
        propertyKey: "f",
      });
    }).rejects.toThrow(
      'Websocket Routing: method must not contain a separator "." in method "testing.fail"'
    );
  });
  it("should be possible to call the func method", (d) => {
    class target {
      constructor() {}
      f() {
        d();
      }
    }

    const route = new WebsocketRoute("testing", {
      target: target.prototype,
      propertyKey: "f",
    });
    expect(route).toBeTruthy();
    expect(route.Func).toBeTruthy();
    if (route.Func) route.Func(null, null as any);
  });

  describe("accessor testing", () => {
    class target {
      constructor() {}
      f() {}
    }
    const route = new WebsocketRoute("testing", {
      target: target.prototype,
      propertyKey: "f",
    });
    it("should be possible to get the method of a route", () => {
      expect(route.Method).toBe("testing");
      expect(route.Children).toHaveLength(0);
      expect(route.Func).toBeDefined();
      route.Method = "test1";
      expect(route.Method).toBe("test1");
    });
    it("should throw when a route method is modified and the new method contains the separator", (d) => {
      try {
        route.Method = "test.test";
      } catch (e) {
        d();
      }
    });
  });
  describe("children management", () => {
    it("should be possible to add a child to a route", async () => {
      class target {
        f1() {}
        f2(data: any) {
          expect(data).toEqual({ in: "here" });
          return { value: "anything" };
        }
      }

      const route = new WebsocketRoute("testing1", {
        target: target.prototype,
        propertyKey: "f1",
      });
      const child = new WebsocketRoute("child", {
        target: target.prototype,
        propertyKey: "f2",
      });
      route.addChild(child);
      WebsocketRouter.registerRoute(route);
      const conn = WebsocketMocks.getConnectionStub();

      conn.runRequest("testing1.child", { in: "here" });

      const data = await conn.expectMethod("m.testing1.child");
      expect(data).toStrictEqual({ value: "anything" });
    });
  });

  it("should be possible to access `this` inside methods", () => {
    class target {
      private data: string = "init";
      get() {
        return this.data;
      }
      set(data: any) {
        this.data = data;
        this.update();
      }
      private update() {
        this.data = this.data + this.data;
      }
    }

    const get = new WebsocketRoute("get", {
      target: target.prototype,
      propertyKey: "get",
    });
    const set = new WebsocketRoute("set", {
      target: target.prototype,
      propertyKey: "set",
    });

    expect(get.Func(null, conn)).toBe("init");
    expect(get.Func(null, conn)).toBe("init");
    set.Func("update", conn);
    expect(get.Func(null, conn)).toBe("updateupdate");
  });

  it("should return null when accessing func if no target is defined", async () => {
    const conn = WebsocketMocks.getConnectionStub();

    const f1 = new WebsocketRoute("testing", {
      target: null,
      propertyKey: "",
    });
    const f2 = new WebsocketRoute("testing", null as any);
    expect(f1.Func).toBeNull();
    expect(f2.Func).toBeNull();

    await expect(
      f2.route(new WebsocketRequest("testing", null, conn), ["testing"])
    ).rejects.toThrow('Websocket: Function not defined for route "testing"');
  });

  describe("request routing", () => {
    class target {
      f1() {
        return -1;
      }
      child() {
        return -2;
      }
    }
    const route = new WebsocketRoute("f1", {
      target: target.prototype,
      propertyKey: "f1",
    });
    const child = new WebsocketRoute("child", {
      target: target.prototype,
      propertyKey: "child",
    });
    route.addChild(child);
    WebsocketRouter.registerRoute(route);

    it("should be possible to route the request", async () => {
      const conn = WebsocketMocks.getConnectionStub();

      conn.runRequest("f1", {});
      expect(await conn.expectMethod("m.f1")).toBeTruthy();
      conn.runRequest("f1.child", {});
      expect(await conn.expectMethod("m.f1.child")).toBe(-2);
    });
  });

  describe("error handling", () => {
    class target {
      async f1() {
        throw Error("...");
      }
      async f2() {
        throw "...";
      }
    }
    const route1 = new WebsocketRoute("f1_", {
      target: target.prototype,
      propertyKey: "f1",
    });
    const route2 = new WebsocketRoute("f2_", {
      target: target.prototype,
      propertyKey: "f2",
    });
    WebsocketRouter.registerRoute(route1);
    WebsocketRouter.registerRoute(route2);

    testEach<WebsocketRoute>(
      [route1, route2],
      ["f1_", "f2_"],
      (route: WebsocketRoute, label: string) => {
        it(
          "should not resolve the promise when " + label + " failed",
          async () => {
            const conn = WebsocketMocks.getConnectionStub();
            conn.runRequest(label, null);
            conn.dontExpectMethod("m." + label);
            expect(await conn.expectError()).toBe("...");
          }
        );
      }
    );
  });
});

describe("standalone route", () => {
  it("should be possible to create a route", () => {
    class target {
      constructor() {}
      f() {}
    }

    const route = new StandaloneWebsocketRoute("testing.t", {
      target: target.prototype,
      propertyKey: "f",
    });
    expect(route).toBeTruthy();
  });
  it("should be possible to call the func method", (d) => {
    class target {
      constructor() {}
      f() {
        d();
      }
    }

    const route = new StandaloneWebsocketRoute("testing.t", {
      target: target.prototype,
      propertyKey: "f",
    });
    expect(route).toBeTruthy();
    expect(route.Func).toBeTruthy();
    if (route.Func) route.Func(null, null as any);
  });

  describe("accessor testing", () => {
    class target {
      constructor() {}
      f() {}
    }
    const route = new StandaloneWebsocketRoute("testing.t", {
      target: target.prototype,
      propertyKey: "f",
    });
    it("should be possible to get the method of a route", () => {
      expect(route.Method).toBe("testing.t");
      expect(route.Children).toHaveLength(0);
      expect(route.Func).toBeDefined();
      route.Method = "test1";
      expect(route.Method).toBe("test1");
    });
  });
  describe("children management", () => {
    class target {
      f1() {}
      f2(data: any) {
        expect(data).toEqual({ in: "here" });
        return { value: "anything" };
      }
    }

    const route = new StandaloneWebsocketRoute("testing.t", {
      target: target.prototype,
      propertyKey: "f1",
    });
    const child = new WebsocketRoute("child", {
      target: target.prototype,
      propertyKey: "f2",
    });
    it("should not be possible to add a child to a route", async () => {
      await expect(async () => {
        route.addChild(child);
      }).rejects.toThrow("child");
    });
  });

  it("should be possible to access `this` inside methods", () => {
    class target {
      private data: string = "init";
      get() {
        return this.data;
      }
      set(data: any) {
        this.data = data;
        this.update();
      }
      private update() {
        this.data = this.data + this.data;
      }
    }

    const get = new StandaloneWebsocketRoute("get", {
      target: target.prototype,
      propertyKey: "get",
    });
    const set = new StandaloneWebsocketRoute("set", {
      target: target.prototype,
      propertyKey: "set",
    });

    expect(get.Func(null, conn)).toBe("init");
    expect(get.Func(null, conn)).toBe("init");
    set.Func("update", conn);
    expect(get.Func(null, conn)).toBe("updateupdate");
  });

  it("should return null when accessing func if no target is defined", async () => {
    const conn = WebsocketMocks.getConnectionStub();

    const f1 = new StandaloneWebsocketRoute("testing", {
      target: null,
      propertyKey: "",
    });
    const f2 = new StandaloneWebsocketRoute("testing", null as any);
    expect(f1.Func).toBeNull();
    expect(f2.Func).toBeNull();

    await expect(
      f2.route(new WebsocketRequest("testing", null, conn), ["testing"])
    ).rejects.toThrow('Websocket: Function not defined for route "testing"');
  });

  describe("request routing", () => {
    class target {
      f1() {
        return -1;
      }
      child() {
        return -2;
      }
    }
    const route = new StandaloneWebsocketRoute("f1.t", {
      target: target.prototype,
      propertyKey: "f1",
    });
    beforeAll(() => {
      WebsocketRouter.registerStandaloneRoute(route);
    });

    it("should be possible to route the request", async () => {
      const conn = WebsocketMocks.getConnectionStub();

      conn.runRequest("f1.t", {});
      expect(await conn.expectMethod("m.f1.t")).toBeTruthy();

      // this route is not defined, should return false
      expect(
        await route.route(new WebsocketRequest("f1", {}, conn), ["f1"])
      ).toBeFalsy();
    });
  });

  describe("error handling", () => {
    class target {
      async f1() {
        throw Error("...");
      }
      async f2() {
        throw "...";
      }
    }
    const route1 = new StandaloneWebsocketRoute("f1.t_", {
      target: target.prototype,
      propertyKey: "f1",
    });
    const route2 = new StandaloneWebsocketRoute("f2.t_", {
      target: target.prototype,
      propertyKey: "f2",
    });

    testEach<WebsocketRoute>(
      [route1, route2],
      ["f1.t_", "f2.t_"],
      (route: WebsocketRoute, label: string) => {
        beforeAll(() => {
          WebsocketRouter.registerStandaloneRoute(route);
        });
        it(
          "should not resolve the promise when " + label + " failed",
          async () => {
            const conn = WebsocketMocks.getConnectionStub();
            conn.runRequest(label, null);
            conn.dontExpectMethod("m." + label);
            expect(await conn.expectMethod("m.error")).toBe("...");
          }
        );
      }
    );
  });
});

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
    requestData: number
  ): Promise<boolean> {
    expect(conn).toBeDefined();
    expect(conn).toBeInstanceOf(WebsocketConnection);
    expect((conn as WebsocketConnection).id).toBeGreaterThanOrEqual(0);
    expect(requestData).toBeDefined();
    expect(requestData).toBeGreaterThan(0);
    return this.grantPermission;
  }
}

describe("authentication", () => {
  beforeAll(() => {
    class target {
      granted(data: number, conn: WebsocketConnection) {
        return data + 1;
      }
      denied(data: any, conn: WebsocketConnection) {
        fail(
          "The denied method was called, even though the request must not pass the authentication step"
        );
      }
    }
    const route1 = new WebsocketRoute("auth", {
      target: target.prototype,
      propertyKey: "granted",
    });
    route1.setAuthenticator(new Authenticator(true));
    WebsocketRouter.registerRoute(route1);

    const route2 = new WebsocketRoute("unauth", {
      target: target.prototype,
      propertyKey: "denied",
    });
    route2.setAuthenticator(new Authenticator(false));
    WebsocketRouter.registerRoute(route2);

    const route3 = new WebsocketRoute("daisy_auth", {
      target: target.prototype,
      propertyKey: "granted",
    });
    const auth3 = new Authenticator(false);
    auth3.or(new Authenticator(true).and(new Authenticator(true)));
    route3.setAuthenticator(auth3);
    WebsocketRouter.registerRoute(route3);

    const route4 = new WebsocketRoute("daisy_unauth", {
      target: target.prototype,
      propertyKey: "denied",
    });
    const auth4 = new Authenticator(false);
    auth4.or(new Authenticator(true).and(new Authenticator(false)));
    route4.setAuthenticator(auth4);
    WebsocketRouter.registerRoute(route4);

    const standalone1 = new StandaloneWebsocketRoute("standalone.auth", {
      target: target.prototype,
      propertyKey: "granted",
    });
    standalone1.setAuthenticator(new Authenticator(true));
    WebsocketRouter.registerStandaloneRoute(standalone1);

    const standalone2 = new StandaloneWebsocketRoute("standalone.unauth", {
      target: target.prototype,
      propertyKey: "denied",
    });
    standalone2.setAuthenticator(new Authenticator(false));
    WebsocketRouter.registerStandaloneRoute(standalone2);
  });

  it("should be possible to create a authenticated route", async () => {
    const authRoutes = WebsocketRouter.Routes.filter((r) => r.Method == "auth");
    expect(authRoutes).toHaveLength(1);
    expect(authRoutes[0].hasAuthenticator).toBeTruthy();

    const unauthRoutes = WebsocketRouter.Routes.filter(
      (r) => r.Method == "unauth"
    );
    expect(unauthRoutes).toHaveLength(1);
    expect(unauthRoutes[0].hasAuthenticator).toBeTruthy();
  });

  describe("authentication checks", () => {
    it("should be possible to call an authenticated route with (access granted)", async () => {
      const conn = WebsocketMocks.getConnectionStub();
      conn.runRequest("auth", 1);
      expect(await conn.expectMethod("m.auth")).toBe(2);
    });
    it("should reject the call when the authentication process fails (access denied)", async () => {
      const conn = WebsocketMocks.getConnectionStub();
      conn.runRequest("unauth", 1);
      expect(await conn.expectMethod("m.error")).toBe(UNAUTH);
      conn.dontExpectMethod("m.unauth");
    });
    it("should be possible to daisy-chain authenticators (acccess granted)", async () => {
      const conn = WebsocketMocks.getConnectionStub();
      conn.runRequest("daisy_auth", 5);
      expect(await conn.expectMethod("m.daisy_auth")).toBe(6);
    });
    it("should be possible to daisy-chain authenticators (access denied)", async () => {
      const conn = WebsocketMocks.getConnectionStub();
      conn.runRequest("daisy_unauth", 1);
      conn.dontExpectMethod("m.daisy_unauth");
      expect(await conn.expectMethod("m.error")).toBe(UNAUTH);
    });
    it("should be possible to call an authenticated standalone route with (access granted)", async () => {
      const conn = WebsocketMocks.getConnectionStub();
      conn.runRequest("standalone.auth", 10);
      expect(await conn.expectMethod("m.standalone.auth")).toBe(11);
    });
    it("should not be possible to call an authenticated standalone route with (access denied)", async () => {
      const conn = WebsocketMocks.getConnectionStub();
      conn.runRequest("standalone.unauth", 1);
      conn.dontExpectMethod("m.standalone.unauth");
      expect(await conn.expectMethod("m.error")).toBe(UNAUTH);
    });
  });
});

it("should not trigger the sendUpdates action if the route modifies something and authentication fails", async () => {
  class target2 {
    data = "";
    out() {
      return this.data;
    }
    add(i: number) {
      this.data += i.toString();
    }
  }

  const out = new WebsocketOutbound("target2.out", {
    target: target2.prototype,
    propertyKey: "out",
  });
  out.subscribeChanges();
  WebsocketOutbounds.addOutbound(out);

  const route = new StandaloneWebsocketRoute(
    "target2.add",
    { target: target2.prototype, propertyKey: "add" },
    false
  );
  route.modifies(["target2.out"]);
  route.setAuthenticator(new Authenticator(false));

  WebsocketRouter.registerStandaloneRoute(route);

  const conn = WebsocketMocks.getConnectionStub();
  expect(await conn.expectMethod("target2.out")).toBe("");
  conn.runRequest("target2.add", 6);
  expect(await conn.expectMethod("m.error")).toBe("not-authenticated");
  conn.dontExpectMethod("target2.out");
});
