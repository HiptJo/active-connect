"use strict";

export * from "./server";
export * from "./content";
export * from "./decorators";

export class ActiveConnect {
  public static loadCurrentDirectory() {
    var normalizedPath = require("path").join(__dirname);
    require("fs")
      .readdirSync(normalizedPath)
      .forEach(function (file: string) {
        if (
          file.charAt(0) != "_" &&
          (file.endsWith(".ts") || file.endsWith(".js")) &&
          !file.endsWith(".spec.ts")
        )
          require("./" + file);
      });
  }
}
