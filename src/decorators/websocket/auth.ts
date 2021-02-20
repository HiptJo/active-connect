import { WebsocketAuthenticator } from "../../server/websocket/auth/authenticator";
import { WebsocketConnection } from "../../server/websocket/connection/connection";

export function Auth(auth: WebsocketAuthenticator) {
  return function (target: any, propertyKey: string): any {
    // initialize routeDefinition
    if (!propertyKey) {
      throw Error("@Auth is not implemented for classes");
    } else {
      const original = target[propertyKey];
      target[propertyKey] = async function (...data: any[]) {
        let conn: WebsocketConnection;
        if (data.length == 1) conn = data[0];
        if (data.length > 1) conn = data[1];

        if (await auth.authenticate(conn)) {
          return original(...data);
        } else {
          // check if it is a route (not a outlet)
          if (!(target.___wsoutbound && target.___wsoutbound[propertyKey])) {
            conn.send("m.error", "auth:unauthorized:" + auth.label);
          }
          return "error:auth:unauthorized";
        }
      };
    }
  };
}
