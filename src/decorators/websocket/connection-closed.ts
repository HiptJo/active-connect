import { WebsocketConnection } from "../..";

/**
 * @decorator
 * Methods annotated with this decorator will be called when a client closes the WebSocket connection.
 *
 * @example Method annotation:
 * ```
 * @OnWebsocketConnectionClosed
 * function onClosed(conn: WebsocketConnection) { ... }
 * ```
 *
 * @param target - The class or object to which the method belongs.
 * @param propertyKey - The name of the method.
 */
export function OnWebsocketConnectionClosed(target: any, propertyKey: string) {
  // class annotation
  WebsocketConnection.addCloseHandler((conn: WebsocketConnection) =>
    target[propertyKey](conn)
  );
}
