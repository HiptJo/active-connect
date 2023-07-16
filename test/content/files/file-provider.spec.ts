import * as test from "supertest";
import {
  Auth,
  HttpBadRequestError,
  HttpForbiddenError,
  HttpNotFoundError,
  HttpServer,
  HttpUnauthorizedError,
  ProvideFile,
  WebsocketAuthenticator,
  WebsocketConnection,
} from "../../../src/active-connect";
import { ProvidedFile } from "../../../src/content/files/provided-file";

let server: HttpServer;
afterEach(async () => {
  await server.stop();
});
it("should be possible to register a file provider", async () => {
  class Testing {
    @ProvideFile("samplefile")
    public async getSampleFile(): Promise<ProvidedFile> {
      return new ProvidedFile(
        100,
        "provided:samplefile",
        "i am some plain text",
        "plain/text"
      );
    }
  }
  server = new HttpServer(9012, false);
  await server.awaitStart();
  expect(Testing).toBeDefined();
  await test(server.App)
    .get("/file/samplefile")
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe("i am some plain text");
    });
});

it("should be possible to register a file provider with id value", async () => {
  class Testing {
    @ProvideFile("samplefile1")
    public async getSampleFile(id: number): Promise<ProvidedFile> {
      return new ProvidedFile(
        100,
        "provided:samplefile",
        "i am some plain text: id=" + id,
        "plain/text"
      );
    }
  }
  server = new HttpServer(9012, false);
  await server.awaitStart();
  expect(Testing).toBeDefined();
  await test(server.App)
    .get("/file/samplefile1/100")
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe("i am some plain text: id=100");
    });
});

it("should be possible to register a file provider with id and filename value", async () => {
  class Testing {
    @ProvideFile("samplefile2")
    public async getSampleFile(id: number): Promise<ProvidedFile> {
      return new ProvidedFile(
        100,
        "provided:samplefile",
        "i am some plain text: id=" + id,
        "plain/text"
      );
    }
  }
  server = new HttpServer(9012, false);
  await server.awaitStart();
  expect(Testing).toBeDefined();
  await test(server.App)
    .get("/file/samplefile2/100/_/filename")
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe("i am some plain text: id=100");
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
    @Auth(new Authenticator())
    @ProvideFile("authenticated1")
    public async getSampleFile(): Promise<ProvidedFile> {
      return new ProvidedFile(
        100,
        "provided:samplefile",
        "auth okay",
        "plain/text"
      );
    }
  }
  server = new HttpServer(9015, false);
  await server.awaitStart();
  expect(Testing).toBeDefined();
  await test(server.App)
    .get("/file/authenticated1/_/authtoken")
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe("auth okay");
    });
  await test(server.App)
    .get("/file/authenticated1/_/false")
    .then((response) => {
      expect(response.status).toBe(401);
      expect(response.text).not.toBe("auth okay");
    });
});

it("should be possible to use authenticators with file-providers (auth after providefile annotation)", async () => {
  class Testing {
    @ProvideFile("authenticated2")
    @Auth(new Authenticator())
    public async getSampleFile(): Promise<ProvidedFile> {
      return new ProvidedFile(
        100,
        "provided:samplefile",
        "auth okay",
        "plain/text"
      );
    }
  }
  server = new HttpServer(9015, false);
  await server.awaitStart();
  expect(Testing).toBeDefined();
  await test(server.App)
    .get("/file/authenticated2/_/authtoken")
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe("auth okay");
    });
  await test(server.App)
    .get("/file/authenticated2/_/false")
    .then((response) => {
      expect(response.status).toBe(401);
      expect(response.text).not.toBe("auth okay");
    });
});

it("should be possible to use authenticators with file-providers (auth after providefile annotation)", async () => {
  class Testing {
    @ProvideFile("authenticated2")
    @Auth(new Authenticator())
    public async getSampleFile(): Promise<ProvidedFile> {
      return new ProvidedFile(
        100,
        "provided:samplefile",
        "auth okay",
        "plain/text"
      );
    }
  }
  server = new HttpServer(9015, false);
  await server.awaitStart();
  expect(Testing).toBeDefined();
  await test(server.App)
    .get("/file/authenticated2/_/authtoken")
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe("auth okay");
    });
  await test(server.App)
    .get("/file/authenticated2/_/false")
    .then((response) => {
      expect(response.status).toBe(401);
      expect(response.text).not.toBe("auth okay");
    });
});

describe("exception handling", () => {
  it("should send status 400 when an BadRequestError is thrown", async () => {
    class Testing {
      @ProvideFile("bad")
      public async getFile(): Promise<ProvidedFile> {
        throw new HttpBadRequestError();
      }
    }
    server = new HttpServer(9015, false);
    await server.awaitStart();
    expect(Testing).toBeDefined();
    await test(server.App)
      .get("/file/bad")
      .then((response) => {
        expect(response.status).toBe(400);
      });
  });
  it("should send status 401 when an HttpUnauthorizedError is thrown", async () => {
    class Testing {
      @ProvideFile("unauth")
      public async getFile(): Promise<ProvidedFile> {
        throw new HttpUnauthorizedError();
      }
    }
    server = new HttpServer(9015, false);
    await server.awaitStart();
    expect(Testing).toBeDefined();
    await test(server.App)
      .get("/file/unauth")
      .then((response) => {
        expect(response.status).toBe(401);
      });
  });
  it("should send status 403 when an HttpForbiddenError is thrown", async () => {
    class Testing {
      @ProvideFile("forbidden")
      public async getFile(): Promise<ProvidedFile> {
        throw new HttpForbiddenError();
      }
    }
    server = new HttpServer(9015, false);
    await server.awaitStart();
    expect(Testing).toBeDefined();
    await test(server.App)
      .get("/file/forbidden")
      .then((response) => {
        expect(response.status).toBe(403);
      });
  });
  it("should send status 404 when an HttpNotFoundError is thrown", async () => {
    class Testing {
      @ProvideFile("notfound")
      public async getFile(): Promise<ProvidedFile> {
        throw new HttpNotFoundError();
      }
    }
    server = new HttpServer(9015, false);
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
      @ProvideFile("error")
      public async getFile(): Promise<ProvidedFile> {
        throw new Error("...");
      }
    }
    server = new HttpServer(9015, false);
    await server.awaitStart();
    expect(Testing).toBeDefined();
    await test(server.App)
      .get("/file/error")
      .then((response) => {
        expect(response.status).toBe(500);
      });
  });
});
