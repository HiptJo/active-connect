import { ActiveConnect } from "../../src";

it("should be possible to load a dir", async () => {
  expect(() => {
    ActiveConnect.loadCurrentDirectory(__dirname);
  }).toThrow("file has been loaded");
});
