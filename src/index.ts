"use strict";

export * from "./server";
export * from "./content";
export * from "./decorators";

export class ActiveConnect {
  /**
   * Loads all ts/js files in the speficied directory.
   * Can be used to load route config without importing the files.
   * @param dirname - absolute path of directory to load.
   *
   * @example
   * ```
   * ActiveConnect.loadCurrentDirectory(__dirname);
   * ```
   */
  public static loadCurrentDirectory(dirname: string) {
    var normalizedPath = require("path").join(dirname);
    require("fs")
      .readdirSync(normalizedPath)
      .forEach(function (file: string) {
        if (
          file.charAt(0) != "_" &&
          (file.endsWith(".ts") || file.endsWith(".js")) &&
          !file.endsWith(".spec.ts")
        )
          require(dirname + "/" + file);
      });
  }
}
