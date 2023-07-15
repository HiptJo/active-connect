import { WebsocketOutboundDecoratorConfig } from "../../../decorators/config/websocket-outbound-decorator-config";
import { MessageFilter } from "../auth/authenticator";
import { WebsocketConnection } from "../connection/connection";
import { AuthableDecorableFunction } from "./function";
import { SimpleWebsocketRoute } from "./route";
import { WebsocketRouter } from "./router";

/**
 * @deprecated
 * Interface for checking WebSocket authorization.
 */
export interface WebsocketAuthorizationCheckable {
  /**
   * Checks WebSocket authorization based on the provided authentication token.
   * @param authToken - The authentication token to check.
   * @returns A promise that resolves to true if the authentication is valid, otherwise false.
   */
  checkAuth(authToken: string): Promise<boolean>;
}

/**
 * This object is used to configure an outbound.
 * Outbounds are used to send data to clients and support features like authentication checks and subscription management.
 */
export class WebsocketOutbound extends AuthableDecorableFunction {
  /**
   * Creates a new outbound configuration.
   * @param method - The method represents a unique identifier for the outbound. Data sent is labeled using the method.
   * @param objConfig - The configuration object containing the method functionality.
   * @param objConfig.target - The prototype of the class containing the source code of this outbound. (e.g., `MyClass.prototype`)
   * @param objConfig.propertyKey - The name of the function within the class.
   * @param lazyLoading - When enabled, data is not sent initially to all clients. They can request it if needed.
   * @param resendAfterAuthenticationChange - When enabled, data is updated once any route with `modifiesAuthentication=true` is called by this connection.
   *                                   This can be used to automatically send the user data to the client once the client is signed in.
   */
  constructor(
    public method: string,
    objConfig: { target: any; propertyKey: string },
    lazyLoading?: boolean,
    public resendAfterAuthenticationChange?: boolean
  ) {
    super(objConfig);
    this.lazyLoading = lazyLoading;
  }

  private _lazyLoading: boolean = false;

  /**
   * When enabled, data is not sent initially to all clients. They can request it if needed.
   */
  public set lazyLoading(lazyLoading: boolean) {
    if (lazyLoading && lazyLoading != this._lazyLoading) {
      const method = this.method;
      WebsocketRouter.registerStandaloneRoute(
        new SimpleWebsocketRoute(`request.${method}`, async function request(
          data: any,
          conn: WebsocketConnection
        ) {
          await WebsocketOutbounds.sendSingleOutboundByMethod(method, conn);
        })
      );
    }
    this._lazyLoading = lazyLoading;
  }

  /**
   * When enabled, data is not sent initially to all clients. They can request it if needed.
   */
  public get lazyLoading() {
    return this._lazyLoading;
  }

  private subscribesChanges: boolean = false;
  private subscribesFilteredChanges: MessageFilter[] = [];

  /**
   * Enables subscribing to changes for this outbound.
   * @param filter - Optional filter for subscribing to filtered changes.
   */
  public subscribeChanges(filter?: MessageFilter) {
    if (filter) {
      this.subscribesFilteredChanges.push(filter);
    } else {
      this.subscribesChanges = true;
    }
  }

  /**
   * Subscribes the provided connection to this outbound's changes.
   * @param conn - The WebSocket connection to subscribe.
   * @param response - The response object associated with the subscription.
   */
  public async subscribeForConnection(
    conn: WebsocketConnection,
    response: any
  ) {
    this.addSubscriptionForKey(null, conn);
    for await (const filter of this.subscribesFilteredChanges) {
      this.addSubscriptionForKey(await filter.filter(response, conn), conn);
    }
  }

  private subscribedConnections: Map<number, WebsocketConnection[]> = new Map();

  private addSubscriptionForKey(key: number | null, conn: WebsocketConnection) {
    const result = this.subscribedConnections.get(key);
    if (!result) {
      this.subscribedConnections.set(key, [conn]);
    } else {
      // Check if connection is not already inside the map
      if (!result.includes(conn)) {
        this.subscribedConnections.get(key).push(conn);
      }
    }
  }

  /**
   * Sends the outbound data to the provided connection.
   * @param conn - The WebSocket connection to send the data to.
   */
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
      if (!e?.isAuthenticationError) {
        console.error(e);
        conn.send("m.error", e?.message || e);
      } else if (this.lazyLoading) {
        conn.send("m.error", e?.message || e);
      }
    }
  }

  /**
   * Sends the outbound data to the provided connection if it is subscribed to changes.
   * @param conn - The WebSocket connection to send the data to.
   */
  public async sendToIfSubscribed(conn: WebsocketConnection) {
    if (this.connectionSubscribesForChanges(conn)) {
      this.sendTo(conn);
    }
  }

  /**
   * Checks if the provided connection is subscribed to changes for this outbound.
   * @param conn - The WebSocket connection to check.
   * @returns True if the connection is subscribed, otherwise false.
   */
  public connectionSubscribesForChanges(conn: WebsocketConnection) {
    for (const conns of this.subscribedConnections) {
      for (const c of conns[1]) {
        if (c === conn) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Sends updated data to all subscribed connections for the specified key or for all changes.
   * @param key - Optional key for filtering the connections to update.
   */
  public async sendUpdatedData(key?: number) {
    if (key || this.subscribesChanges) {
      const connections = this.subscribedConnections.get(key || null);
      if (connections) {
        await Promise.all(connections.map((conn) => this.sendTo(conn)));
      }
    }
  }

  /**
   * Unsubscribes the provided connection from all subscriptions.
   * @param conn - The WebSocket connection to unsubscribe.
   */
  public unsubscribeConnection(conn: WebsocketConnection) {
    for (const key of this.subscribedConnections.keys()) {
      const connections = this.subscribedConnections.get(key);
      const index = connections.indexOf(conn);
      if (index >= 0) {
        connections.splice(index);
      }
    }
  }

  /**
   * Determines if subscriptions are enabled for this outbound.
   */
  public get subscriptionEnabled() {
    return this.subscribesChanges || this.subscribesFilteredChanges.length > 0;
  }

  /**
   * Handles an error when it occurs during outbound function execution.
   * @param conn - The WebSocket connection to send the error message to.
   * @param message - The error message to send.
   */
  protected sendError(conn: WebsocketConnection, message: string) {
    // do not send error
  }

  private decoratorConfigReference: WebsocketOutboundDecoratorConfig;

  /**
   * Binds the decorator configuration reference to the WebSocket outbound.
   * @param reference - The decorator configuration reference.
   * @returns - The WebSocket outbound instance.
   */
  public bindDecoratorConfig(reference: WebsocketOutboundDecoratorConfig) {
    this.decoratorConfigReference = reference;
    return this;
  }

  /**
   * Loads the decorator configuration from the bound reference.
   */
  public loadDecoratorConfig() {
    if (this.decoratorConfigReference) {
      if (this.decoratorConfigReference.authenticator) {
        this.setAuthenticator(this.decoratorConfigReference.authenticator);
      }
      if (this.decoratorConfigReference.lazyLoading) {
        this.lazyLoading = true;
      }
      if (this.decoratorConfigReference.resendAfterAuthenticationChange) {
        this.resendAfterAuthenticationChange = true;
      }
      if (this.decoratorConfigReference.subscriptionEnabled) {
        this.subscribeChanges();
      }
      if (this.decoratorConfigReference.subscriptionsFor) {
        for (var filter of this.decoratorConfigReference.subscriptionsFor) {
          this.subscribeChanges(filter);
        }
      }
    }
  }
}

/**
 * Manages all used outbounds.
 * All active outbounds must be registered using `WebsocketOutbounds.addOutbound(...)`.
 * Registered outbounds are sent to clients automatically when they open a connection.
 * Eager loading and lazy loading are supported, with eager loading being the default strategy.
 * Note: Outbounds registered using decorators are not automatically added again.
 */
export class WebsocketOutbounds {
  private static outbounds: Map<string, WebsocketOutbound> = new Map();

  /**
   * Registers an outbound configuration.
   * Registered outbounds are sent to clients when they open a connection.
   * @param outbound - The outbound configuration to register.
   */
  public static addOutbound(outbound: WebsocketOutbound) {
    if (this.hasOutbound(outbound.method)) {
      throw Error(
        "ActiveConnect: Two outbounds have been registered using the same method (" +
          outbound.method +
          ")"
      );
    }
    WebsocketOutbounds.outbounds.set(outbound.method, outbound);
  }

  /**
   * Retrieves the registered outbound configuration for the specified method.
   * @param method - The method of the outbound configuration.
   * @returns The registered outbound configuration, or undefined if not found.
   */
  public static getOutbound(method: string): WebsocketOutbound | null {
    return WebsocketOutbounds.outbounds.get(method) || null;
  }

  /**
   * Checks if an outbound configuration with the specified method exists.
   * @param method - The method of the outbound configuration.
   * @returns The registered outbound configuration, or undefined if not found.
   */
  public static hasOutbound(method: string): boolean {
    return this.getOutbound(method) != null;
  }

  /**
   * Sends updated data to all subscribed connections for the defined methods.
   * Once the first outbound (method[0]) has been updated, the promise is resolved.
   * @param methods - Methods of the outbounds to be updated.
   * @param [key] - Optional key for filtering the connections to update.
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
   * Sends the current state of data to subscribed connections for the specified method.
   * This method is responsible for sending updated data to connections that have subscribed to the specified method.
   *
   * @param method - The method of the outbound that should be updated.
   * @param [key] - Optional key for filtering the connections to update.
   * @throws {Error} If the outbound for the specified method does not exist or subscription is not enabled.
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
   * Unsubscribes the provided connection from all subscriptions.
   * This can be used when the connection closes the connection.
   * @param conn - The closed connection.
   */
  public static unsubscribeConnection(conn: WebsocketConnection) {
    WebsocketOutbounds.outbounds.forEach((o) => o.unsubscribeConnection(conn));
  }

  /**
   * Sends all outbound data to a client. This is triggered once the client opens a new connection.
   * The connection automatically subscribes for updates when it is enabled in the outbound config.
   * @param conn - Data is sent to this connection.
   */
  public static async sendToConnection(conn: WebsocketConnection) {
    for (var out of WebsocketOutbounds.outbounds) {
      if (!out[1].lazyLoading) await out[1].sendTo(conn);
    }
  }

  /**
   * Triggers the requested outbound to be sent to the given connection.
   * The connection automatically subscribes for updates when it is enabled in the outbound config.
   * @param method - Method of the requested outbound.
   * @param connection - The WebSocket connection to send the outbound data to.
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
   * Re-sends all outbounds to the connection where the resendAfterAuthentication flag is present.
   * @param connection - The WebSocket connection to resend the outbounds to.
   */
  public static async resendDataAfterAuth(connection: WebsocketConnection) {
    WebsocketOutbounds.outbounds.forEach(async function sendOutbound(o) {
      if (o.resendAfterAuthenticationChange) {
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
   * Retrieves all registered outbound configurations.
   * @returns An array of registered outbound configurations.
   */
  public static getAllOutbounds() {
    return Array.from(this.outbounds.values());
  }

  /**
   * Removes all registered Outbounds
   */
  public static clear() {
    this.outbounds.clear();
  }

  /**
   * Loads the decorator configuration for all WebSocket outbounds.
   * Iterates through each route and invokes the `loadDecoratorConfig` method to load the configuration.
   */
  public static loadDecoratorConfig() {
    for (var outbound of this.outbounds) {
      outbound[1].loadDecoratorConfig();
    }
  }

  /**
   * Remove an registered outbound
   * @param method - Method of the outbound to be deleted
   * @returns true if an element in the Map existed and has been removed, or false if the element does not exist.
   */
  public static removeOutboundByMethod(method: string): boolean {
    return WebsocketOutbounds.outbounds.delete(method);
  }
}
