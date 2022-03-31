export class JsonParser {
  static stringify(obj: any) {
    return JSON.stringify(obj);
  }

  static parsingFunction(key: any, value: any) {
    var a;
    if (typeof value === "string") {
      a =
        /^[0-9]{4}\-[0-9]{2}\-[0-9]{2}T[0-9]{2}\:[0-9]{2}\:[0-9]{2}\.[0-9]{3}Z$/.exec(
          value
        );
      if (a) {
        return new Date(a as any);
      }
    }
    return value;
  }

  static parse(str: string) {
    if (str && str != "undefined") {
      return JSON.parse(str, JsonParser.parsingFunction);
    }
    return str;
  }
}
