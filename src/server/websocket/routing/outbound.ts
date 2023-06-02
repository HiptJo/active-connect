import { MessageFilter } from "../auth/authenticator";
import { WebsocketConnection } from "../connection/connection";
import { DecorableFunction } from "./function";
import { StandaloneWebsocketRoute } from "./route";
import { WebsocketRouter } from "./router";

export interface WebsocketAuthorizationCheckable {
  checkAuth(authToken: string): Promise<boolean>;
}

export class Outbound extends DecorableFunction {
  constructor(
    public method: string,
    objConfig: { target: any; propertyKey: string },
    public requestingRequired?: boolean,
    public resendAfterAuthentication?: boolean
  ) {
    super(objConfig);
  }

  private subscribesChanges: boolean = false;
  private subscribesFilteredChanges: MessageFilter[] = [];

  public subscribeChanges(filter?: MessageFilter) {
    if (filter) {
      this.subscribesFilteredChanges.push(filter);
    } else {
      this.subscribesChanges = true;
    }
  }

  public async subscribeForConnection(
    conn: WebsocketConnection,
    response: any
  ) {
    if (this.subscribesChanges) {
      this.addSubscriptionForKey(null, conn);
    }
    for await (var filter of this.subscribesFilteredChanges) {
      this.addSubscriptionForKey(await filter.filter(response, conn), conn);
    }
  }

  private subscribedConnections: Map<number, WebsocketConnection[]> = new Map();
  private addSubscriptionForKey(key: number, conn: WebsocketConnection) {
    var result = this.subscribedConnections.get(key);
    if (!result) {
      this.subscribedConnections.set(key, [conn]);
    } else {
      // check if connection not already inside map
      if (!result.includes(conn)) {
        this.subscribedConnections.get(key).push(conn);
      }
    }
  }

  public async sendTo(conn: WebsocketConnection) {
    try {
      const res = await this.Func(conn);
      if (
        res &&
        !res.toString().startsWith("auth:unauthorized") &&
        !res.toString().startsWith("error:auth:unauthorized")
      ) {
        conn.send(this.method, res);
        await this.subscribeForConnection(conn, res);
      }
    } catch (e) {
      console.error(e);
      conn.send("m.error", e?.message || e);
    }
  }

  public async sendUpdatedData(key?: number) {
    var connections = this.subscribedConnections.get(key || null);
    if (connections) {
      await Promise.all(connections.map((conn) => this.sendTo(conn)));
    }
  }

  public unsubscribeConnection(conn: WebsocketConnection) {
    for (var key of this.subscribedConnections.keys()) {
      this.subscribedConnections.set(
        key,
        this.subscribedConnections.get(key).filter((c) => c != conn)
      );
    }
  }
}

export class WebsocketOutbound {
  private static outbounds: Map<string, Outbound> = new Map();
  public static addOutbound(outbound: Outbound) {
    WebsocketOutbound.outbounds.set(outbound.method, outbound);
    if (outbound.requestingRequired) {
      WebsocketRouter.registerStandaloneRoute(
        new StandaloneWebsocketRoute(`request.${outbound.method}`, {
          target: class Fetch {
            async fetch(data: any, conn: WebsocketConnection) {
              await WebsocketOutbound.requestOutbound(outbound.method, conn);
            }
          }.prototype,
          propertyKey: "fetch",
        })
      );
    }
  }

  public static getOutbound(method: string): Outbound | null {
    return WebsocketOutbound.outbounds.get(method) || null;
  }

  public static async sendUpdates(routes: Array<string>, key?: any) {
    var methods = [...routes];

    // send updates for first route instantly
    await WebsocketOutbound.sendUpdatesForMethod(methods.shift(), key);

    // send updates for others in the background
    Promise.all(
      methods.map((m) => WebsocketOutbound.sendUpdatesForMethod(m, key))
    );
  }

  private static async sendUpdatesForMethod(
    method: string,
    key: number | null
  ) {
    var outbound = this.outbounds.get(method);
    if (outbound) {
      await outbound.sendUpdatedData(key);
    } else {
      console.error(
        `Websocket: Can not send updates to outbound "${method}" as it does not exist.`
      );
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
  public static unsubscribeConnection(conn: WebsocketConnection) {
    WebsocketOutbound.outbounds.forEach((o) => o.unsubscribeConnection(conn));
  }

  public static async sendToConnection(conn: WebsocketConnection) {
    for (var out of WebsocketOutbound.outbounds) {
      if (!out[1].requestingRequired) await out[1].sendTo(conn);
    }
  }

  public static async requestOutbound(
    method: string,
    connection: WebsocketConnection
  ) {
    const outbound = WebsocketOutbound.outbounds.get(method);
    if (outbound) {
      await outbound.sendTo(connection);
    } else {
      throw Error(`Websocket: Outbound ${method} has not been found.`);
    }
  }

  public static async resendDataAfterAuth(connection: WebsocketConnection) {
    WebsocketOutbound.outbounds.forEach(async function sendOutbound(o) {
      if (!o.requestingRequired && o.resendAfterAuthentication)
        o.sendTo(connection);
    });
  }

  static get size(): number {
    return WebsocketOutbound.outbounds.size;
  }
  static clear() {
    WebsocketOutbound.outbounds.clear();
  }
}
