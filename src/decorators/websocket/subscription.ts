import { WebsocketConnection } from "../../server/websocket/connection/connection";
import { WebsocketOutbound } from "../../server/websocket/routing/outbound";

export function SubscribeChanges(target: any, propertyKey: string): any {
  // initialize routeDefinition
  WebsocketOutbound.addOutboundSubscription(
    target.___wsoutbound[propertyKey],
    async () => {
      if (
        target.___outboundSubscriptions &&
        target.___outboundSubscriptions[propertyKey]
      ) {
        const connections: WebsocketConnection[] =
          target.___outboundSubscriptions[propertyKey];
        const res = await Promise.all(
          connections.map((conn: WebsocketConnection) => {
            return target[propertyKey](conn);
          })
        );
        connections.forEach((conn, i) => {
          conn.send(target.___wsoutbound[propertyKey], res[i]);
        });
      }
    }
  );
  const original = target[propertyKey];
  target[propertyKey] = async function (...data: any[]) {
    let conn: WebsocketConnection;
    if (data.length == 1) conn = data[0];
    if (data.length > 1) conn = data[2];
    const res = await original(...data);
    if (res != "error:auth:unauthorized") {
      // subscribe for changes
      if (!target.___outboundSubscriptions)
        target.___outboundSubscriptions = [];
      if (!target.___outboundSubscriptions[propertyKey])
        target.___outboundSubscriptions[propertyKey] = [];
      if (target.___outboundSubscriptions[propertyKey].indexOf(conn) < 0)
        target.___outboundSubscriptions[propertyKey].push(conn);
    }
    return res;
  };
}
export function Modifies(...routes: string[]) {
  return function (target: any, propertyKey: string) {
    const original = target[propertyKey];
    target[propertyKey] = async function (...params: any[]) {
      await original(...params);
      await WebsocketOutbound.sendUpdates(routes);
    };
  };
}
