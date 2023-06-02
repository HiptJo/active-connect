import { WebsocketConnection } from "../../server/websocket/connection/connection";
import { WebsocketOutbound } from "../../server/websocket/routing/outbound";

export function SubscribeMatchingChanges(filter: MessageFilter) {
  return function subscribe(target: any, propertyKey: string): any {
    // initialize routeDefinition
    if (!target.___registerSubscriptionF) target.___registerSubscriptionF = {};
    target.___registerSubscriptionF[propertyKey] = true;

    const original = target[propertyKey].bind(target.___data);
    if (!target.___outboundSubscriptionsF)
      target.___outboundSubscriptionsF = {};
    target.___outboundSubscriptionsF[propertyKey] = [];

    WebsocketOutbound.addConnectionDisconnectHandler(
      function onConnectionDisconnect(conn: WebsocketConnection) {
        target.___outboundSubscriptionsF[propertyKey].forEach(
          (e: any, i: any) => {
            if (target.___outboundSubscriptionsF[propertyKey][i]) {
              target.___outboundSubscriptionsF[propertyKey][i] = e.filter(
                (c: WebsocketConnection) => c.id && c.id != conn.id
              );
            }
          }
        );
      }
    );

    target[propertyKey] = async function _subscribeChanges(
      ...data: Array<any>
    ) {
      let conn: WebsocketConnection;
      conn = data[0];
      const res = await original(...data);
      if (
        res &&
        !res.toString().startsWith("auth:unauthorized") &&
        !res.toString().startsWith("error:auth:unauthorized")
      ) {
        const pattern = await filter.filter(res, conn);
        registerSubscription(target, propertyKey, pattern);

        // subscribe for changes
        if (!target.___outboundSubscriptionsF[propertyKey][pattern])
          target.___outboundSubscriptionsF[propertyKey][pattern] = [];
        if (
          target.___outboundSubscriptionsF[propertyKey] &&
          target.___outboundSubscriptionsF[propertyKey][pattern] &&
          target.___outboundSubscriptionsF[propertyKey][pattern].indexOf(conn) <
            0
        ) {
          target.___outboundSubscriptionsF[propertyKey][pattern].push(conn);
        }
      }
      return res;
    };
    if (target.___wsoutbound && target.___wsoutbound[propertyKey]) {
      // outbound has been registered already, add subscription
    }
    return target;
  };
}

export function ModifiesMatching(
  filter: MessageFilter,
  ...routes: Array<string>
) {
  return function _Modifies(target: any, propertyKey: string) {
    const original = target[propertyKey].bind(target.___data);
    target[propertyKey] = async function _subscribeModification(
      ...params: Array<any>
    ) {
      const data = await original(...params);
      await WebsocketOutbound.sendUpdates(
        routes,
        await filter.filter(params[0], params[1])
      );
      return data;
    };
    return target;
  };
}
function registerSubscription(target: any, propertyKey: string, pattern: any) {
  const out = WebsocketOutbound.getOutbound(target.___wsoutbound[propertyKey]);
  if (out) out.func = target[propertyKey].bind(target.___data);

  WebsocketOutbound.addOutboundSubscription(
    target.___wsoutbound[propertyKey] + ":" + pattern,
    async function onAddOutboundSubscription() {
      if (
        target.___outboundSubscriptionsF &&
        target.___outboundSubscriptionsF[propertyKey]
      ) {
        const connections: Array<WebsocketConnection> =
          target.___outboundSubscriptionsF[propertyKey][pattern];
        const res = await Promise.all(
          connections.map(function map(conn: WebsocketConnection) {
            return target[propertyKey](conn);
          })
        );
        connections.forEach(function sendUpdate(conn, i) {
          conn.send(target.___wsoutbound[propertyKey], res[i]);
        });
      }
    }
  );
}
