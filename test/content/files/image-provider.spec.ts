import * as test from "supertest";

import { HttpServer, ProvideImage } from "../../../src/active-connect";
import { ProvidedFile } from "../../../src/content/files/provided-file";
import { ProvidedImage } from "../../../src/content/images/provided-image";

let server: HttpServer;
afterEach(async () => {
  await server.stop();
});
it("should be possible to register a file provider", async () => {
  class Testing {
    @ProvideImage("sampleimage")
    public async getSampleFile(): Promise<ProvidedFile> {
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
