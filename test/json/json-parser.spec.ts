import { JsonParser } from "../../src/json/json-parser";

test("json parsing", () => {
  expect(JsonParser.parse(undefined)).toBe(undefined);
  expect(JsonParser.parse(JsonParser.stringify(1))).toBe(1);
  expect(JsonParser.parse(JsonParser.stringify({ nb: 1 }))).toStrictEqual({
    nb: 1,
  });
  expect(
    JsonParser.parse(JsonParser.stringify({ date: new Date(Date.now()) })).date
      .toDateString
  ).toBeDefined();
  expect(
    JsonParser.parse(
      JsonParser.stringify({ date: new Date(Date.now()) })
    ).date.toDateString()
  ).toBeDefined();
});
