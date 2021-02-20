import { WebsocketAuthenticator } from "../../server/websocket/auth/authenticator";
import { WebsocketConnection } from "../../server/websocket/connection/connection";

export function Auth(auth: WebsocketAuthenticator) {
  return function (target: any, propertyKey?: string): any {
    // initialize routeDefinition
    if (!propertyKey) {
      throw Error("@Auth is not implemented for classes");
    } else {
      const original = target[propertyKey];
      target[propertyKey] = async function (
        data: any,
        conn: WebsocketConnection
      ) {
        if (await auth.authenticate(conn)) {
          return original(data, conn);
        } else {
          conn.send("m.error", "auth:unauthorized:" + auth.label);
          return "error:auth:unauthorized";
        }
      };
    }
  };
}
