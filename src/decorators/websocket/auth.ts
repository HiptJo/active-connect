import { WebsocketAuthenticator } from "../../server/websocket/auth/authenticator";
import { WebsocketConnection } from "../../server/websocket/connection/connection";
import { WebsocketOutbound } from "../../server/websocket/routing/outbound";

export function Auth(auth: WebsocketAuthenticator) {
  return function _Auth(target: any, propertyKey: string): any {
    // initialize routeDefinition
    const original = target[propertyKey].bind(target.___data);
    target[propertyKey] = async function _Auth_Check(...data: Array<any>) {
      let conn: WebsocketConnection;
      if (data.length == 1) conn = data[0];
      if (data.length > 1) conn = data[1];

      if (await auth.authenticate(conn, data.length > 1 ? data[0] : null)) {
        return original(...data);
      } else {
        // check if it is a route (not a outlet)
        if (!(target.___wsoutbound && target.___wsoutbound[propertyKey])) {
          conn.send(
            "m.error",
            "Die Aktion wurde nicht durchgeführt. Haben Sie die notwendigen Berechtigungen? (" +
              auth.label +
              ")"
          );
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
        out.func = target[propertyKey].bind(target.___data);
      }
    }
    return target;
  };
}
