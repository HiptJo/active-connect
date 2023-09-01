import { WebsocketOutbounds } from "./websocket";

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

  private static timeout = 3000;
  /**
   * When an expected method is not received in that amount of milliseconds, the test fails.
   * @returns the timeout value
   */
  public static getTimeout() {
    return ActiveConnect.timeout;
  }
  /**
   * When an expected method is not received in that amount of milliseconds, the test fails.
   * @returns the timeout value
   */
  public static setTimeout(ms: number) {
    ActiveConnect.timeout = ms;
  }

  /**
   * Closes all Websocket Connections
   * Only suitable for test runs.
   */
  public static closeAllConnections() {
    WebsocketOutbounds.closeAllConnections();
  }
}
