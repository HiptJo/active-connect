import * as test from "supertest";
import { HttpServer, ProvideFile } from "../../../src/active-connect";
import { ProvidedFile } from "../../../src/content/files/provided-file";

let server: HttpServer;
afterEach(() => {
  server.stop();
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
