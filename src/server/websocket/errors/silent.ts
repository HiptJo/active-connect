/**
 * When thrown inside a WebSocket route or outbound, these errors are sent to the client (m.error),
 * but they are not thrown or logged on the server-side.
 */
export class SilentError extends Error {
  /**
   * Indicates that this error is a silent error.
   */
  public readonly SILENT = 1;
}
