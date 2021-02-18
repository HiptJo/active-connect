import { Route } from "../../../src/decorators/websocket/route";
import { WebsocketRouter } from "../../../src/server/websocket/routing/router";

it("should be possible to annotate a class", () => {
  @Route("annotationtesting1")
  class Testing {}

  expect(Testing).toBeDefined();
  expect(
    WebsocketRouter.Routes.filter((r) => r.Method == "annotationtesting1")
  ).toHaveLength(1);
});
