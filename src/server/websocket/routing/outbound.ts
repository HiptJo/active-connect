import { WebsocketConnection } from "../connection/connection";

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
        const out = this.outboundSubscriptions.get(route);
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

  public sendToConnection(connection: WebsocketConnection) {
    WebsocketOutbound.outbounds.forEach(async (o) => {
      if (!o.requestingRequired) await this.sendOutbound(o, connection);
    });
  }

  private async sendOutbound(
    outbound: Outbound,
    connection: WebsocketConnection
  ) {
    const res = await outbound.func(connection);
    if (res != "error:auth:unauthorized") connection.send(outbound.method, res);
  }

  public async requestOutbound(
    method: string,
    connection: WebsocketConnection
  ) {
    const outbounds = WebsocketOutbound.outbounds.filter(
      (o) => o.method === method
    );
    if (outbounds.length > 0) {
      await this.sendOutbound(outbounds[0], connection);
    } else {
      throw Error(`Websocket: Outbound ${method} has not been found.`);
    }
  }
  static get count(): number {
    return WebsocketOutbound.outbounds.length;
  }
  static clear() {
    this.outbounds = [];
  }
}
