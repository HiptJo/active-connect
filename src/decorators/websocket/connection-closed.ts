import { WebsocketConnection } from "../../active-connect";

export function OnWebsocketConnectionClosed(target: any, propertyKey: string) {
  // class annotation
  WebsocketConnection.addCloseHandler((conn: WebsocketConnection) =>
    target[propertyKey](conn)
  );
}