import * as test from "supertest";

import {
  Auth,
  HttpBadRequestError,
  HttpForbiddenError,
  HttpNotFoundError,
  HttpServer,
  HttpUnauthorizedError,
  ProvideImage,
  WebsocketAuthenticator,
  WebsocketConnection,
} from "../../../src/active-connect";
import { ProvidedImage } from "../../../src/content/images/provided-image";

describe("server testing", () => {
  let server: HttpServer;
  afterEach(async () => {
    await server.stop();
  });
  it("should be possible to register a file provider", async () => {
    class Testing {
      @ProvideImage("sampleimage")
      public async getSampleFile(): Promise<ProvidedImage> {
        return ProvidedImage.getFromDataURL(
          "data:image/png;base64,iVasdfasdfasdf",
          1,
          ""
        );
      }
    }
    server = new HttpServer(9011, false);
    await server.awaitStart();
    expect(Testing).toBeDefined();
    await test(server.App)
      .get("/image/sampleimage")
      .then((response) => {
        expect(response.status).toBe(200);
      });
  });

  it("should be possible to register a file provider with id value", async () => {
    class Testing {
      @ProvideImage("sampleimage1")
      public async getSampleFile(id: number | string): Promise<ProvidedImage> {
        if (!(id == 100 || id == "data"))
          throw Error("Data has not been transmitted");
        return ProvidedImage.getFromDataURL(
          "data:image/png;base64,iVasdfasdfasdf",
          1,
          ""
        );
      }
    }
    server = new HttpServer(9011, false);
    await server.awaitStart();
    expect(Testing).toBeDefined();
    await test(server.App)
      .get("/image/sampleimage1/100")
      .then((response) => {
        expect(response.status).toBe(200);
      });
    await test(server.App)
      .get("/image/sampleimage1/data")
      .then((response) => {
        expect(response.status).toBe(200);
      });
  });

  class Authenticator extends WebsocketAuthenticator {
    public label: string = "auth";
    public unauthenticatedMessage: string = "unauth";
    public async authenticate(
      conn: string | WebsocketConnection,
      requestData: any
    ): Promise<boolean> {
      return conn == "authtoken";
    }
  }

  it("should be possible to use authenticators with file-providers (auth before providefile annotation)", async () => {
    class Testing {
      @ProvideImage("authenticated1")
      @Auth(new Authenticator())
      public async getSampleFile(): Promise<ProvidedImage> {
        return new ProvidedImage(1, "label", "data", "image/png");
      }
    }
    server = new HttpServer(9011, false);
    await server.awaitStart();
    expect(Testing).toBeDefined();
    await test(server.App)
      .get("/image/authenticated1/_/authtoken")
      .then((response) => {
        expect(response.status).toBe(200);
      });
    await test(server.App)
      .get("/image/authenticated1/_/false")
      .then((response) => {
        expect(response.status).toBe(401);
      });
  });

  it("should be possible to use authenticators with file-providers (auth after providefile annotation)", async () => {
    class Testing {
      @ProvideImage("authenticated2")
      @Auth(new Authenticator())
      public async getSampleFile(): Promise<ProvidedImage> {
        return new ProvidedImage(1, "label", "data", "image/png");
      }
    }
    server = new HttpServer(9011, false);
    await server.awaitStart();
    expect(Testing).toBeDefined();
    await test(server.App)
      .get("/image/authenticated2/_/authtoken")
      .then((response) => {
        expect(response.status).toBe(200);
      });
    await test(server.App)
      .get("/image/authenticated2/_/false")
      .then((response) => {
        expect(response.status).toBe(401);
      });
  });

  describe("exception handling", () => {
    it("should send status 400 when an BadRequestError is thrown", async () => {
      class Testing {
        @ProvideImage("bad")
        public async getImage(): Promise<ProvidedImage> {
          throw new HttpBadRequestError();
        }
      }
      server = new HttpServer(9011, false);
      await server.awaitStart();
      expect(Testing).toBeDefined();
      await test(server.App)
        .get("/image/bad")
        .then((response) => {
          expect(response.status).toBe(400);
        });
    });
    it("should send status 401 when an HttpUnauthorizedError is thrown", async () => {
      class Testing {
        @ProvideImage("unauth")
        public async getImage(): Promise<ProvidedImage> {
          throw new HttpUnauthorizedError();
        }
      }
      server = new HttpServer(9011, false);
      await server.awaitStart();
      expect(Testing).toBeDefined();
      await test(server.App)
        .get("/image/unauth")
        .then((response) => {
          expect(response.status).toBe(401);
        });
    });
    it("should send status 403 when an HttpForbiddenError is thrown", async () => {
      class Testing {
        @ProvideImage("forbidden")
        public async getImage(): Promise<ProvidedImage> {
          throw new HttpForbiddenError();
        }
      }
      server = new HttpServer(9011, false);
      await server.awaitStart();
      expect(Testing).toBeDefined();
      await test(server.App)
        .get("/image/forbidden")
        .then((response) => {
          expect(response.status).toBe(403);
        });
    });
    it("should send status 404 when an HttpNotFoundError is thrown", async () => {
      class Testing {
        @ProvideImage("notfound")
        public async getImage(): Promise<ProvidedImage> {
          throw new HttpNotFoundError();
        }
      }
      server = new HttpServer(9011, false);
      await server.awaitStart();
      expect(Testing).toBeDefined();
      await test(server.App)
        .get("/file/notfound")
        .then((response) => {
          expect(response.status).toBe(404);
        });
    });
    it("should send status 404 when an HttpNotFoundError is thrown", async () => {
      class Testing {
        @ProvideImage("error")
        public async getImage(): Promise<ProvidedImage> {
          throw new Error("...");
        }
      }
      server = new HttpServer(9011, false);
      await server.awaitStart();
      expect(Testing).toBeDefined();
      await test(server.App)
        .get("/image/error")
        .then((response) => {
          expect(response.status).toBe(500);
        });
    });
  });
});

it("should throw an error when parsing dataurl is not successful", async () => {
  expect(() => {
    ProvidedImage.getFromDataURL("DATA NOT URL", 1, "");
  }).toThrow("Could not get ProvidedImage from DataURL");
});
