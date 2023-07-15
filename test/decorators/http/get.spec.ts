import * as test from "supertest";
import { GET, HttpServer } from "../../../src/active-connect";
import { Response, Request } from "express";

let server: HttpServer;
afterEach(async () => {
  await server.stop();
});
it("should be possible to register a get method", async () => {
  class Testing {
    @GET("/sample/location")
    public async getData(req: Request, res: Response) {
      res.send("{ some data is delivered }");
    }
  }
  server = new HttpServer(9010, false);
  await server.awaitStart();
  expect(Testing).toBeDefined();
  await test(server.App)
    .get("/sample/location")
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe("{ some data is delivered }");
    });
});
