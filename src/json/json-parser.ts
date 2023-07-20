/**
 * Parses WebSocket messages after they have been transmitted.
 * Some values, like dates, are automatically casted to type-specific objects.
 */
export class JsonParser {
  /**
   * Converts an object to its JSON string representation.
   * @param obj - The object to stringify.
   * @returns The JSON string representation of the object.
   */
  static stringify(obj: any) {
    return JSON.stringify(obj);
  }

  /**
   * The parsing function used by JSON.parse() to handle specific value conversions.
   * @param key - The key of the current property being parsed.
   * @param value - The value of the current property being parsed.
   * @returns The parsed value, with dates casted to Date objects if applicable.
   */
  static parsingFunction(key: any, value: any) {
    var canBeCastedToDate;
    if (typeof value === "string") {
      canBeCastedToDate =
        /^[0-9]{4}\-[0-9]{2}\-[0-9]{2}T[0-9]{2}\:[0-9]{2}\:[0-9]{2}\.[0-9]{3}Z$/.exec(
          value
        );
      if (canBeCastedToDate) {
        return new Date(canBeCastedToDate as any);
      }
    }
    return value;
  }

  /**
   * Parses a JSON string into an object, applying value conversions using the parsing function.
   * @param str - The JSON string to parse.
   * @returns The parsed object.
   */
  static parse(str: string) {
    if (str && str != "undefined") {
      return JSON.parse(str, JsonParser.parsingFunction);
    }
    return str;
  }
}
