import { WebsocketRouteDecoratorConfig } from "../../../decorators/websocket/config/websocket-route-decorator-config";
import { MessageFilter } from "../auth/authenticator";
import { WebsocketConnection } from "../connection/connection";
import { WebsocketRequest } from "../message/request";
import { AuthableDecorableFunction } from "./function";
import { WebsocketOutbounds } from "./outbound";

const ERROR = "__active-connect_error__";

/**
 * Represents a WebSocket route that can be used for routing and handling WebSocket requests.
 */
export class WebsocketRoute extends AuthableDecorableFunction {
  protected method: string;

  /**
   * Creates an instance of WebsocketRoute.
   * @param method - The method name for the route.
   * @param objConfig - The configuration object for the object method.
   * @param objConfig.target - The target object.
   * @param objConfig.propertyKey - The property key of the target object.
   * @param [modifiesAuthentication] - Indicates whether the route modifies authentication.
   */
  constructor(
    method: string,
    objConfig: { target: any; propertyKey: string },
    private modifiesAuthentication?: boolean
  ) {
    super(objConfig);
    this.Method = method;
  }

  /**
   * Returns the method name for the route.
   * @returns - The method name.
   */
  public get Method(): string {
    return this.method;
  }

  /**
   * Sets the method name for the route.
   * @param method - The method name.
   * @throws {Error} - If the method contains a separator ".".
   */
  public set Method(method: string) {
    if (method.indexOf(".") >= 0)
      throw Error(
        `Websocket Routing: method must not contain a separator "." in method "${method}"`
      );
    this.method = method;
  }

  private modifiesOutbounds: {
    filter: MessageFilter | null;
    outboundRoutes: string[];
  }[] = [];

  /**
   * Registers the outbound methods whose data is potentially modified during the execution of this route.
   * @param outboundRoutes - The outbound routes that are potentially modified.
   * @param [filter] - The message filter.
   */
  public modifies(outboundRoutes: string[], filter?: MessageFilter) {
    this.modifiesOutbounds.push({ filter: filter || null, outboundRoutes });
  }

  protected children: Array<WebsocketRoute> = [];

  /**
   * Returns the child routes of the current route.
   * @returns - The child routes.
   */
  public get Children(): Array<WebsocketRoute> {
    return this.children;
  }

  /**
   * Adds a child route to the current route.
   * @param child - The child route to add.
   */
  public addChild(child: WebsocketRoute) {
    this.children.push(child);
  }

  /**
   * Routes the WebSocket request based on the provided path.
   * Sends error message to the connection if the route call fails.
   * @param request - The WebSocket request.
   * @param path - The path to route.
   * @returns - Indicates whether the routing was successful.
   */
  public async route(
    request: WebsocketRequest,
    path: Array<string>
  ): Promise<boolean> {
    if (path.length === 1 && path[0] === this.method) {
      const res = await this.call(request);
      if (res != ERROR) {
        request.connection.send(
          `m.${request.method}`,
          res,
          request.messageId || -1
        );
      }
      return true;
    }

    // check for children
    if (
      path.length > 1 &&
      path[0] === this.method &&
      this.children &&
      this.children.length > 0
    ) {
      return this.routeChildren(request, path.slice(1));
    }
    return false;
  }

  /**
   * Routes the WebSocket request to the children routes.
   * @protected
   * @param request - The WebSocket request.
   * @param path - The path to route.
   * @returns - Indicates whether the routing was successful.
   */
  protected async routeChildren(
    request: WebsocketRequest,
    path: Array<string>
  ): Promise<boolean> {
    for (const child of this.children) {
      if (await child.route(request, path)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calls the object method associated with the route and handles the response.
   * @protected
   * @param request - The WebSocket request.
   * @returns - The response of the object method.
   * @throws {Error} - If the object method is not defined for the route.
   */
  protected async call(request: WebsocketRequest): Promise<any> {
    if (this.Func) {
      try {
        const data = await this.Func(request.data, request.connection);
        await this.resendModifiedData(data, request.connection);
        if (this.modifiesAuthentication)
          WebsocketOutbounds.resendDataAfterAuth(request.connection).then();
        return data;
      } catch (e) {
        if (!e?.isAuthenticationError) {
          console.error(e);
          request.connection.send("m.error", e?.message || e);
        }
        return ERROR;
      }
    } else {
      throw Error(`Websocket: Function not defined for route "${this.method}"`);
    }
  }

  /**
   * Triggers the execution of resending processes of updated data.
   * @private
   * @param responseData - The response data from the original call. It can be used within filter methods.
   * @param requestConn - The WebSocket connection.
   */
  private async resendModifiedData(
    responseData: any,
    requestConn: WebsocketConnection
  ) {
    for await (var config of this.modifiesOutbounds) {
      const filter = config.filter
        ? await config.filter.filter(responseData, requestConn)
        : undefined;
      if (config.outboundRoutes && config.outboundRoutes.length > 0)
        WebsocketOutbounds.sendUpdates(config.outboundRoutes, filter);
    }
  }

  /**
   * Sends an error message to the WebSocket connection.
   * @protected
   * @param conn - The WebSocket connection.
   * @param message - The error message.
   */
  protected sendError(conn: WebsocketConnection, message: string): void {
    conn.send("m.error", message);
  }

  private decoratorConfigReference: WebsocketRouteDecoratorConfig;

  /**
   * Binds the decorator configuration reference to the WebSocket route.
   * @param reference - The decorator configuration reference.
   * @returns - The WebSocket route instance.
   */
  public bindDecoratorConfig(reference: WebsocketRouteDecoratorConfig) {
    this.decoratorConfigReference = reference;
    return this;
  }

  /**
   * Loads the decorator configuration from the bound reference.
   * Recursively initializes loading for all child routes.
   */
  public loadDecoratorConfig() {
    if (this.decoratorConfigReference) {
      if (this.decoratorConfigReference.authenticator) {
        this.setAuthenticator(this.decoratorConfigReference.authenticator);
      }
      if (this.decoratorConfigReference.modifies) {
        this.modifies(this.decoratorConfigReference.modifies);
      }
      if (this.decoratorConfigReference.modifiesFor) {
        for (var mod of this.decoratorConfigReference.modifiesFor) {
          this.modifies(mod.outbounds, mod.filter);
        }
      }
      if (this.decoratorConfigReference.modifiesAuthentication) {
        this.modifiesAuthentication = true;
      }
    }
    if (this.children) {
      for (var child of this.children) {
        child.loadDecoratorConfig();
      }
    }
  }
}

/**
 * Represents a standalone WebSocket route that handles WebSocket requests independently.
 * This way, routes without parent routes can be registered and are still allowed to contain `.` path separators.
 */
export class StandaloneWebsocketRoute extends WebsocketRoute {
  /**
   * Creates an instance of StandaloneWebsocketRoute.
   * @param method - The method name for the route.
   * @param objConfig - The configuration object for the object method.
   * @param objConfig.target - The target object.
   * @param objConfig.propertyKey - The property key of the target object.
   * @param [modifiesAuthentication] - Indicates whether the route modifies authentication.
   */
  constructor(
    method: string,
    objConfig: { target: any; propertyKey: string },
    modifiesAuthentication?: boolean
  ) {
    super(method, objConfig, modifiesAuthentication);
  }

  /**
   * Sets the method name for the route.
   * @param method - The method name.
   */
  public set Method(method: string) {
    this.method = method;
  }
  /**
   * Returns the method name for the route.
   * @returns - The method name.
   */
  public get Method(): string {
    return this.method;
  }

  /**
   * Routes the WebSocket request based on the method name.
   * @param request - The WebSocket request.
   * @param path - The path to route.
   * @returns - Indicates whether the routing was successful.
   */
  public async route(
    request: WebsocketRequest,
    path: Array<string>
  ): Promise<boolean> {
    // check if responsible for handling
    if (request.method === this.method) {
      const res = await this.call(request);
      if (res != ERROR) {
        request.connection.send(
          `m.${request.method}`,
          res,
          request.messageId || -1
        );
      }
      return true;
    }

    return false;
  }

  /**
   * Throws an error as child routes are not supported for standalone routes.
   * @throws {Error} - Child routes are not supported for standalone routes.
   */
  public addChild(child: WebsocketRoute) {
    throw Error(
      "Websocket: child routes are not supported for standalone routes"
    );
  }
}

/**
 * Represents a simple WebSocket route that does not require a target/propertyKey configuration.
 * This can be used to register a route for anonymous functions.
 */
export class SimpleWebsocketRoute extends WebsocketRoute {
  /**
   * Creates an instance of SimpleWebsocketRoute.
   * @param method - The method name for the route.
   * @param func - The function to be called for the route.
   * @param [modifiesAuthentication] - Indicates whether the route modifies authentication.
   */
  constructor(
    method: string,
    private func: (...data: any[]) => Promise<any>,
    modifiesAuthentication?: boolean
  ) {
    super(method, null, modifiesAuthentication);
  }

  /**
   * Returns the function associated with the route.
   * @returns {function} - The function associated with the route.
   */
  get Func(): (...data: any[]) => Promise<any> | any {
    return this.func;
  }

  public static loadDecoratorConfig() {}
}
