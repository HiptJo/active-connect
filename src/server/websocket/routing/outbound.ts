import { WebsocketConnection } from "../connection/connection";
import { StandaloneWebsocketRoute } from "./route-standalone";
import { WebsocketRouter } from "./router";

export interface WebsocketAuthorizationCheckable {
  checkAuth(authToken: string): Promise<boolean>;
}

export class Outbound {
  constructor(
    public method: string,
    public func: (connection: WebsocketConnection) => Promise<any>,
    public requestingRequired?: boolean
  ) {}
}

export class WebsocketOutbound {
  private static outbounds: Array<Outbound> = [];
  public static addOutbound(outbound: Outbound) {
    WebsocketOutbound.outbounds.push(outbound);
    if (outbound.requestingRequired) {
      WebsocketRouter.registerStandaloneRoute(
        new StandaloneWebsocketRoute(
          outbound.method,
          async (data: any, conn: WebsocketConnection) => {
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
  private static outboundSubscriptions: Map<string, () => void> = new Map();
  public static addOutboundSubscription(
    outbound: string,
    sendUpdates: () => void
  ) {
    WebsocketOutbound.outboundSubscriptions.set(outbound, sendUpdates);
  }
  public static async sendUpdates(routes: string[]) {
    await Promise.all(
      routes.map((route) => {
        const out = WebsocketOutbound.outboundSubscriptions.get(route);
        if (out) return out();
      })
    );
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
    WebsocketOutbound.connectionDisconnectHandler.forEach((handler) =>
      handler(conn)
    );
  }

  public static sendToConnection(connection: WebsocketConnection) {
    WebsocketOutbound.outbounds.forEach(async (o) => {
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
      if (res != "error:auth:unauthorized")
        connection.send(outbound.method, res);
    } catch (e) {
      connection.send("m.error", e?.message || e);
      throw e;
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
  static get count(): number {
    return WebsocketOutbound.outbounds.length;
  }
  static clear() {
    WebsocketOutbound.outbounds = [];
  }
}
