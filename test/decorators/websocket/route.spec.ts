import { Route } from "../../../src/decorators/websocket/route";
import { WebsocketConnection } from "../../../src/server/websocket/connection/connection";
import { WebsocketRouter } from "../../../src/server/websocket/routing/router";

it("should be possible to annotate a class", () => {
  @Route("annotationtesting1")
  class Testing {}

  expect(Testing).toBeDefined();
  expect(
    WebsocketRouter.Routes.filter((r) => r.Method == "annotationtesting1")
  ).toHaveLength(1);
});

it("should be possible to annotate a method", () => {
  @Route("annotesting2")
  class Testing {
    @Route("child")
    func(data: any, conn: WebsocketConnection) {}
  }

  expect(Testing).toBeDefined();
  const base = WebsocketRouter.Routes.filter((r) => r.Method == "annotesting2");
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(1);
  expect(base[0].Children[0].Method).toBe("child");
});

it("should be possible to add a class to another base route", () => {
  @Route("testingbase1")
  class Base {}
  @Route("sub", "testingbase1")
  class Sub {
    @Route("child")
    func(data: any, conn: WebsocketConnection) {}
  }

  expect(Base).toBeDefined();
  expect(Sub).toBeDefined();

  const base = WebsocketRouter.Routes.filter((r) => r.Method == "testingbase1");
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(1);
  expect(base[0].Children[0].Method).toBe("sub");
  expect(base[0].Children[0].Children).toHaveLength(1);
  expect(base[0].Children[0].Children[0].Method).toBe("child");
});

it("should be possible to add a method to another base route", () => {
  @Route("testingbase2")
  class Base {}
  @Route("another")
  class Sub {
    @Route("child", "testingbase2")
    func(data: any, conn: WebsocketConnection) {}
  }

  expect(Base).toBeDefined();
  expect(Sub).toBeDefined();

  const base = WebsocketRouter.Routes.filter((r) => r.Method == "testingbase2");
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(1);
  expect(base[0].Children[0].Method).toBe("child");
  expect(base[0].Children[0].Children).toHaveLength(0);
});
it("should throw when creating a class to another base route when that route does not exist yet", (d) => {
  try {
    @Route("another", "testingbase3")
    class Sub {
      @Route("child")
      func(data: any, conn: WebsocketConnection) {}
    }
    expect(Sub).not.toBeUndefined();
  } catch (e) {
    d();
  }
});
it("should throw when creating a method to another base route when that route does not exist yet", (d) => {
  try {
    @Route("another")
    class Sub {
      @Route("child", "testingbase4")
      func(data: any, conn: WebsocketConnection) {}
    }
    expect(Sub).not.toBeDefined();
  } catch (e) {
    d();
  }
});
