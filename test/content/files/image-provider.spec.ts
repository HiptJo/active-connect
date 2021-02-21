import * as test from "supertest";
import { HttpServer, ProvideImage } from "../../../src/active-connect";
import { ProvidedFile } from "../../../src/content/files/provided-file";

let server: HttpServer;
afterEach(() => {
  server.stop();
});
it("should be possible to register a file provider", async () => {
  class Testing {
    @ProvideImage("sampleimage")
    public async getSampleFile(): Promise<ProvidedFile> {
      return new ProvidedFile(
        100,
        "provided:samplefile",
        "i am some plain text",
        "plain/text"
      );
    }
  }
  server = new HttpServer(9003, false);
  await server.awaitStart();
  expect(Testing).toBeDefined();
  await test(server.App)
    .get("/image/sampleimage")
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.text).toBe("i am some plain text");
    });
});
