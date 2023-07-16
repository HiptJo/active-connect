it("should raise an error on calling fail()", () => {
  expect(() => {
    fail("err");
  }).toThrow("err");
});
