import { WebsocketConnection } from "../connection/connection";
import { StandaloneWebsocketRoute } from "./route";
import { WebsocketRouter } from "./router";
export interface WebsocketAuthorizationCheckable {
  checkAuth(authToken: string): Promise<boolean>;
}

export class Outbound {
  constructor(
    public method: string,
    public func: (connection: WebsocketConnection) => Promise<any>,
    public requestingRequired?: boolean,
    public resendAfterAuthentication?: boolean
  ) {}
}

export class WebsocketOutbound {
  private static outbounds: Array<Outbound> = [];
  public static addOutbound(outbound: Outbound) {
    WebsocketOutbound.outbounds.push(outbound);
    if (outbound.requestingRequired) {
      WebsocketRouter.registerStandaloneRoute(
        new StandaloneWebsocketRoute(
          `request.${outbound.method}`,
          async function fetchOutboundData(
            data: any,
            conn: WebsocketConnection
          ) {
            await WebsocketOutbound.requestOutbound(outbound.method, conn);
          }
        )
      );
    }
  }

  public static getOutbound(method: string): Outbound | null {
    const vars = WebsocketOutbound.outbounds.filter((o) => o.method == method);
    if (vars.length > 0) {
      return vars[0];
    }
    return null;
  }
  private static outboundSubscriptions: Map<
    string,
    () => Promise<void>
  > = new Map();
  public static addOutboundSubscription(
    outbound: string,
    sendUpdates: () => Promise<void>
  ) {
    WebsocketOutbound.outboundSubscriptions.set(outbound, sendUpdates);
  }
  public static async sendUpdates(routes: Array<string>, pattern?: any) {
    const p: Promise<any>[] = routes.map(function sendUpdatesForRoute(route) {
      let out = WebsocketOutbound.outboundSubscriptions.get(
        pattern ? route + ":" + pattern : route
      );
      if (out) return out();
      WebsocketOutbound.outboundSubscriptions.forEach(
        function sendUpdatesForRoute(val: () => Promise<void>, key: string) {
          if (key.startsWith(route + ":")) {
            out = val;
          }
        }
      );
      if (out) return out();

      return new Promise<void>((resolve) => {
        resolve();
      });
    });
    if (p.length > 0) {
      // await first update
      await p[0];
    }
    if (p.length > 1) {
      // send other updates without awaiting
      for (let i = 1; i < p.length; i++) {
        p[i].then();
      }
    }
  }

  private static connectionDisconnectHandler: Array<
    (conn: WebsocketConnection) => void
  > = Array();
  public static addConnectionDisconnectHandler(
    callback: (conn: WebsocketConnection) => void
  ) {
    WebsocketOutbound.connectionDisconnectHandler.push(callback);
  }
  public static clearConnectionSubscriptions(conn: WebsocketConnection) {
    WebsocketOutbound.connectionDisconnectHandler.forEach(
      function clearConnectionSubscriptionHandler(handler) {
        handler(conn);
      }
    );
  }

  public static sendToConnection(connection: WebsocketConnection) {
    WebsocketOutbound.outbounds.forEach(async function sendOutbound(o) {
      if (!o.requestingRequired)
        await WebsocketOutbound.sendOutbound(o, connection);
    });
  }

  private static async sendOutbound(
    outbound: Outbound,
    connection: WebsocketConnection
  ) {
    try {
      const res = await outbound.func(connection);
      if (
        res &&
        !res.toString().startsWith("auth:unauthorized") &&
        !res.toString().startsWith("error:auth:unauthorized")
      )
        connection.send(outbound.method, res);
    } catch (e) {
      connection.send("m.error", e?.message || e);
      throw Error(e);
    }
  }

  public async requestOutbound(
    method: string,
    connection: WebsocketConnection
  ) {
    return WebsocketOutbound.requestOutbound(method, connection);
  }
  public static async requestOutbound(
    method: string,
    connection: WebsocketConnection
  ) {
    const outbounds = WebsocketOutbound.outbounds.filter(
      (o) => o.method === method
    );
    if (outbounds.length > 0) {
      await WebsocketOutbound.sendOutbound(outbounds[0], connection);
    } else {
      throw Error(`Websocket: Outbound ${method} has not been found.`);
    }
  }

  public static async resendDataAfterAuth(connection: WebsocketConnection) {
    WebsocketOutbound.outbounds.forEach(async function sendOutbound(o) {
      if (!o.requestingRequired && o.resendAfterAuthentication)
        await WebsocketOutbound.sendOutbound(o, connection);
    });
  }

  static get count(): number {
    return WebsocketOutbound.outbounds.length;
  }
  static clear() {
    WebsocketOutbound.outbounds = [];
  }
}
