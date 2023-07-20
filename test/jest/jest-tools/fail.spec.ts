it("should raise an error on calling fail()", () => {
  expect(() => {
    fail("err");
  }).toThrow("err");
});
it("should raise an error containing default message on calling fail() without param", () => {
  expect(() => {
    fail();
  }).toThrow("Test not successful (fail)");
});
