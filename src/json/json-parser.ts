import * as fde from "fast-deep-equal";

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

  /**
   * Duplicates an object
   */
  static clone(data: any) {
    if (data.charAt) {
      // is string, does not need to be duplicated
      return data;
    }
    return JsonParser.parse(JsonParser.stringify(data));
  }

  /**
   * Compares two objects.
   * @returns true when the two objects are equal
   */
  static deepCompare(obj1: any, obj2: any) {
    return fde(obj1, obj2);
  }

  /**
   * @deprecated
   * Compares two objects.
   * @returns true when the two objects are equal
   */
  public static _deepCompare(obj1: any, obj2: any) {
    // Check if both objects are the same type
    if (typeof obj1 !== typeof obj2) {
      return false;
    }

    // If both objects are primitive types or functions, compare them directly
    if (
      typeof obj1 === "string" ||
      typeof obj1 === "number" ||
      typeof obj1 === "boolean" ||
      typeof obj1 === "function" ||
      obj1 === null ||
      obj2 === null
    ) {
      return obj1 === obj2;
    }

    // Compare arrays
    if (Array.isArray(obj1)) {
      if (obj1.length !== obj2.length) {
        return false;
      }
      for (let i = 0; i < obj1.length; i++) {
        if (!JsonParser._deepCompare(obj1[i], obj2[i])) {
          return false;
        }
      }
      return true;
    }

    // Compare objects
    if (typeof obj1 === "object" && typeof obj2 === "object") {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);

      if (keys1.length !== keys2.length) {
        return false;
      }

      for (let key of keys1) {
        if (
          !obj2.hasOwnProperty(key) ||
          !JsonParser._deepCompare(obj1[key], obj2[key])
        ) {
          return false;
        }
      }
      return true;
    }

    return false;
  }
}
