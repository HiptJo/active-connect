import { DecorableFunction } from "../../decorator-config";
import { WebsocketConnection } from "../server/connection/connection";

/**
 * Methods annotated with this decorator will be called when a client closes the WebSocket connection.
 *
 * @example Method annotation:
 * ```
 * @OnWebsocketConnectionClosed
 * function onClosed(conn: WebsocketConnection) { ... }
 * ```
 */
export function OnWebsocketConnectionClosed(target: any, propertyKey: string) {
  // class annotation
  WebsocketConnection.addCloseHandler(
    new DecorableFunction({ target, propertyKey })
  );
}
