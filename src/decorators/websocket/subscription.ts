import { WebsocketConnection } from "../../server/websocket/connection/connection";
import { WebsocketOutbound } from "../../server/websocket/routing/outbound";

export function SubscribeChanges(target: any, propertyKey: string): any {
  // initialize routeDefinition
  if (!target.___registerSubscription) target.___registerSubscription = {};
  target.___registerSubscription[propertyKey] = true;

  const original = target[propertyKey].bind(target.___data);
  if (!target.___outboundSubscriptions) target.___outboundSubscriptions = {};
  target.___outboundSubscriptions[propertyKey] = [];

  WebsocketOutbound.addConnectionDisconnectHandler(
    (conn: WebsocketConnection) => {
      target.___outboundSubscriptions[
        propertyKey
      ] = target.___outboundSubscriptions[propertyKey].filter(
        (c: WebsocketConnection) => c.id && c.id != conn.id
      );
    }
  );

  target[propertyKey] = async function (...data: Array<any>) {
    let conn: WebsocketConnection;
    conn = data[0];
    const res = await original(...data);
    if (res != "error:auth:unauthorized") {
      // subscribe for changes
      if (target.___outboundSubscriptions[propertyKey].indexOf(conn) < 0) {
        target.___outboundSubscriptions[propertyKey].push(conn);
      }
    }
    return res;
  };
  if (target.___wsoutbound && target.___wsoutbound[propertyKey]) {
    // outbound has been registered already, add subscription
    registerSubscription(target, propertyKey);
  }
}
export function Modifies(...routes: Array<string>) {
  return function (target: any, propertyKey: string) {
    const original = target[propertyKey].bind(target.___data);
    target[propertyKey] = async function (...params: Array<any>) {
      const data = await original(...params);
      await WebsocketOutbound.sendUpdates(routes);
      return data;
    };
    return target;
  };
}
export function registerSubscription(target: any, propertyKey: string) {
  const out = WebsocketOutbound.getOutbound(target.___wsoutbound[propertyKey]);
  if (out) out.func = target[propertyKey].bind(target.___data);

  WebsocketOutbound.addOutboundSubscription(
    target.___wsoutbound[propertyKey],
    async () => {
      if (
        target.___outboundSubscriptions &&
        target.___outboundSubscriptions[propertyKey]
      ) {
        const connections: Array<WebsocketConnection> =
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
}
