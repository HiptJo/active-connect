import * as test from "supertest";
import {
  GET,
  HttpResponse,
  HttpServer,
  HttpUnauthorizedError,
} from "../../../src";
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
it("should be possible to register a get method and return a httpResponse", async () => {
  class Testing {
    @GET("/sample/response")
    public async getData(): Promise<HttpResponse> {
      return {
        content: "content",
        contentType: "text/plain",
        status: 200,
        contentEncoding: "binary",
      };
    }
  }
  server = new HttpServer(9010, false);
  await server.awaitStart();
  expect(Testing).toBeDefined();
  await test(server.App)
    .get("/sample/response")
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe("content");
    });
});
it("should return 401 when unauth error is thrown", async () => {
  class Testing {
    @GET("/sample/unauth")
    public async getData() {
      throw new HttpUnauthorizedError();
    }
  }
  server = new HttpServer(9010, false);
  await server.awaitStart();
  expect(Testing).toBeDefined();
  await test(server.App)
    .get("/sample/unauth")
    .then((response) => {
      expect(response.status).toBe(401);
    });
});
