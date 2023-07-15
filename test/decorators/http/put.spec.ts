import * as test from "supertest";
import { HttpServer, PUT } from "../../../src/active-connect";
import { Response, Request } from "express";

let server: HttpServer;
afterEach(async () => {
  await server.stop();
});
it("should be possible to register a put method", async () => {
  class Testing {
    @PUT("/sample/put")
    public async getData(req: Request, res: Response) {
      res.send("{ some data is delivered }");
    }
  }
  server = new HttpServer(9013, false);
  await server.awaitStart();
  expect(Testing).toBeDefined();
  await test(server.App)
    .put("/sample/put")
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe("{ some data is delivered }");
    });
});
