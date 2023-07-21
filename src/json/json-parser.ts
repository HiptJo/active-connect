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

  /**
   * Generates a hash code for a string object.
   * @param s - String for which the hash code should be generated
   * @returns the hash value of the string
   */
  static getHashCode(s: string): number {
    var hash = 0,
      i,
      chr;
    for (i = 0; i < s.length; i++) {
      chr = s.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
}
