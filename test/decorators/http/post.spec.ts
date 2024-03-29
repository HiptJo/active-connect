import * as test from "supertest";
import { HttpServer, POST } from "../../../src";
import { Response, Request } from "express";

let server: HttpServer;
afterEach(async () => {
  await server.stop();
});
it("should be possible to register a file provider", async () => {
  class Testing {
    @POST("/sample/post")
    public async getData(req: Request, res: Response) {
      res.send("{ some data is delivered }");
    }
  }
  server = new HttpServer(9009, false);
  await server.awaitStart();
  expect(Testing).toBeDefined();
  await test(server.App)
    .post("/sample/post")
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe("{ some data is delivered }");
    });
});
