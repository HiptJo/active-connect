import { WebsocketAuthenticator } from "../../server/websocket/auth/authenticator";
import { WebsocketConnection } from "../../server/websocket/connection/connection";
import { WebsocketOutbound } from "../../server/websocket/routing/outbound";

export function Auth(auth: WebsocketAuthenticator) {
  return function (target: any, propertyKey: string): any {
    // initialize routeDefinition
    const original = target[propertyKey].bind(target.___data);
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
    // check if it is an outlet
    if (target.___wsoutbound && target.___wsoutbound[propertyKey]) {
      // update outbound definition
      const out = WebsocketOutbound.getOutbound(
        target.___wsoutbound[propertyKey]
      );
      if (out) {
        out.func = target[propertyKey];
      }
    }
    return target;
  };
}
