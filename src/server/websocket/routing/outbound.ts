import { MessageFilter } from "../auth/authenticator";
import { WebsocketConnection } from "../connection/connection";
import { AuthableDecorableFunction } from "./function";
import { StandaloneWebsocketRoute } from "./route";
import { WebsocketRouter } from "./router";

/**
 * @deprecated
 */
export interface WebsocketAuthorizationCheckable {
  checkAuth(authToken: string): Promise<boolean>;
}

/**
 * This object is used to configure a outbound.
 *
 * Outbounds are used to send data to clients.
 * They support features like authentication-checks, subscription-management and more.
 */
export class WebsocketOutbound extends AuthableDecorableFunction {
  /**
   * Creates a new outbound config
   *
   * @param method - The method represents a unique identifier for the outbound. Data sent is labeled using the method.
   * @param objConfig - This contains a reference to the method functionality
   * @param objConfig.target - The prototype of the class containing the source-code of this outbound. (eg. MyClass.prototype)
   * @param objConfig.propertyKey - The name of the function within the class
   * @param lazyLoading - When this option is enabled, data is not sent initially to all clients. They can request it, if needed.
   * @param resendAfterAuthentication - When enabled, data is updated once any route with `modifiesAuthentication=true` is called by this connection.
   *            This can be used to automatically send the userdata to the client, once the client is signed in.
   */
  constructor(
    public method: string,
    objConfig: { target: any; propertyKey: string },
    public lazyLoading?: boolean,
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
    this.addSubscriptionForKey(null, conn);
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
        !res ||
        (res &&
          !res.toString().startsWith("auth:unauthorized") &&
          !res.toString().startsWith("error:auth:unauthorized"))
      ) {
        await this.subscribeForConnection(conn, res);
        conn.send(this.method, res);
      }
    } catch (e) {
      if (!e.isAuthenticationError) {
        console.error(e);
        conn.send("m.error", e?.message || e);
      }
    }
  }

  public async sendToIfSubscribed(conn: WebsocketConnection) {
    if (this.connectionSubscribesForChanges(conn)) {
      this.sendTo(conn);
    }
  }

  public connectionSubscribesForChanges(conn: WebsocketConnection) {
    for (var conns of this.subscribedConnections) {
      for (var c of conns[1]) {
        if (c == conn) {
          return true;
        }
      }
    }
    return false;
  }

  public async sendUpdatedData(key?: number) {
    if (key || this.subscribesChanges) {
      var connections = this.subscribedConnections.get(key || null);
      if (connections) {
        await Promise.all(connections.map((conn) => this.sendTo(conn)));
      }
    }
  }

  public unsubscribeConnection(conn: WebsocketConnection) {
    for (var key of this.subscribedConnections.keys()) {
      const connections = this.subscribedConnections.get(key);
      const index = connections.indexOf(conn);
      if (index >= 0) {
        connections.splice(index);
      }
    }
  }

  public get subscriptionEnabled() {
    return this.subscribesChanges || this.subscribesFilteredChanges.length > 0;
  }

  protected sendError(conn: WebsocketConnection, message: string) {}
}

/**
 * This is used to manage all used outbounds.
 *
 * All active outbounds have to be registered using `WebsocketOutbounds.addOutbound(...)`
 * Registered outbounds are sent to clients automatically, once they open a connection.
 *
 * Eager loading and lazy loading is supported.
 * The default loading strategy is eager loading.
 *
 * As only one unique outbound configuration is supported, static variables are used.
 */
export class WebsocketOutbounds {
  private constructor() {}

  private static outbounds: Map<string, WebsocketOutbound> = new Map();

  /**
   * Registers a outbound.
   * Registered outbounds are sent to clients, once they open a connection.
   *
   * @param outbound - This outbound configuration will be registered
   */
  public static addOutbound(outbound: WebsocketOutbound) {
    WebsocketOutbounds.outbounds.set(outbound.method, outbound);
    if (outbound.lazyLoading) {
      WebsocketRouter.registerStandaloneRoute(
        new StandaloneWebsocketRoute(`request.${outbound.method}`, {
          target: class Fetch {
            async fetch(data: any, conn: WebsocketConnection) {
              await WebsocketOutbounds.sendSingleOutboundByMethod(
                outbound.method,
                conn
              );
            }
          }.prototype,
          propertyKey: "fetch",
        })
      );
    }
  }

  /**
   * Returns the outbound matching the method, returns null if no outbound has been found
   *
   * @param method
   * @returns
   */
  public static getOutbound(method: string): WebsocketOutbound | null {
    return WebsocketOutbounds.outbounds.get(method) || null;
  }

  /**
   * Sends updated data to all subscribed connections for the defined methods
   * Once the first outbound (method[0]) has been updated, the promise is resolved.
   *
   * @param methods - methods of the outbounds to be updated
   * @param [key]
   */
  public static async sendUpdates(methods: Array<string>, key?: any) {
    var methods = [...methods];

    // send updates for first route instantly
    await WebsocketOutbounds.sendUpdatesForMethod(methods.shift(), key);

    // send updates for others in the background
    Promise.all(
      methods.map((m) => WebsocketOutbounds.sendUpdatesForMethod(m, key))
    );
  }

  /**
   * Sends the current state of data to subscribed connections.
   *
   * @param method - method of the outbound that should be updated
   * @param [key]
   */
  private static async sendUpdatesForMethod(
    method: string,
    key: number | null
  ) {
    var outbound = this.outbounds.get(method);
    if (outbound && outbound.subscriptionEnabled) {
      await outbound.sendUpdatedData(key);
    } else {
      throw Error(
        `Websocket: Can not send updates to outbound "${method}" as it does not exist.`
      );
    }
  }

  /**
   * Unsubscribes this connection from all subscriptions
   * This can be used when the connection closes the connection
   *
   * @param conn - the closed connection
   */
  public static unsubscribeConnection(conn: WebsocketConnection) {
    WebsocketOutbounds.outbounds.forEach((o) => o.unsubscribeConnection(conn));
  }

  /**
   * Sends all outbound data to a client. This is triggered, once the client opens a new connection.
   * The connection automatically subscribes for updates, when it is enabled in the outbound config.
   *
   * @param conn - data is sent to this connection
   */
  public static async sendToConnection(conn: WebsocketConnection) {
    for (var out of WebsocketOutbounds.outbounds) {
      if (!out[1].lazyLoading) await out[1].sendTo(conn);
    }
  }

  /**
   * Triggers the requested outbound to be sent to the given connection.
   * The connection automatically subscribes for updates, when it is enabled in the outbound config.
   *
   * @param method - method of the requested outbound
   * @param connection
   */
  public static async sendSingleOutboundByMethod(
    method: string,
    connection: WebsocketConnection
  ) {
    const outbound = WebsocketOutbounds.outbounds.get(method);
    if (outbound) {
      await outbound.sendTo(connection);
    } else {
      throw Error(`Websocket: Outbound ${method} has not been found.`);
    }
  }

  /**
   * Re-sends all outbound to the connection, where the resendAfterAuthentication flag is present.
   *
   * @param connection
   */
  public static async resendDataAfterAuth(connection: WebsocketConnection) {
    WebsocketOutbounds.outbounds.forEach(async function sendOutbound(o) {
      if (o.resendAfterAuthentication) {
        if (o.lazyLoading) {
          // check if connection is subscribed
          // if it is, trigger resend - else do not resend
          o.sendToIfSubscribed(connection);
        } else {
          o.sendTo(connection);
        }
      }
    });
  }

  /**
   * Returns the number of registered outbounds.
   */
  public static get size(): number {
    return WebsocketOutbounds.outbounds.size;
  }

  /**
   * Resets the outbound config.
   * This removes all outbounds.
   *
   * All outbounds that have been registered using a decorator *are not automatically added* again.
   */
  public static clear() {
    WebsocketOutbounds.outbounds.clear();
  }
}
