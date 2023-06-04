import { MessageFilter } from "../auth/authenticator";
import { WebsocketConnection } from "../connection/connection";
import { WebsocketRequest } from "../message/request";
import { AuthableDecorableFunction } from "./function";
import { WebsocketOutbounds } from "./outbound";

const ERROR = "__active-connect_error__";

export class WebsocketRoute extends AuthableDecorableFunction {
  protected method: string;
  constructor(
    method: string,
    objConfig: { target: any; propertyKey: string },
    private modifiesAuthentication?: boolean
  ) {
    super(objConfig);
    this.Method = method;
  }

  public get Method(): string {
    return this.method;
  }
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
  public modifies(outboundRoutes: string[], filter?: MessageFilter) {
    this.modifiesOutbounds.push({ filter: filter || null, outboundRoutes });
  }

  protected children: Array<WebsocketRoute> = [];
  public get Children(): Array<WebsocketRoute> {
    return this.children;
  }
  public addChild(child: WebsocketRoute) {
    this.children.push(child);
  }

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

  protected async call(request: WebsocketRequest): Promise<any> {
    if (this.Func) {
      try {
        const data = await this.Func(request.data, request.connection);
        await this.resendModifiedData(data, request.connection);
        if (this.modifiesAuthentication)
          WebsocketOutbounds.resendDataAfterAuth(request.connection).then();
        return data;
      } catch (e) {
        if (!e.isAuthenticationError) {
          console.error(e);
          request.connection.send("m.error", e?.message || e);
        }
        return ERROR;
      }
    } else {
      throw Error(`Websocket: Function not defined for route "${this.method}"`);
    }
  }

  private async resendModifiedData(
    responseData: any,
    requestConn: WebsocketConnection
  ) {
    for await (var config of this.modifiesOutbounds) {
      const filter = config.filter
        ? await config.filter.filter(responseData, requestConn)
        : undefined;
      WebsocketOutbounds.sendUpdates(config.outboundRoutes, filter);
    }
  }
}

export class StandaloneWebsocketRoute extends WebsocketRoute {
  constructor(
    method: string,
    objConfig: { target: any; propertyKey: string },
    modifiesAuthentication?: boolean
  ) {
    super(method, objConfig, modifiesAuthentication);
  }

  public set Method(method: string) {
    this.method = method;
  }
  public get Method(): string {
    return this.method;
  }
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

  public addChild(child: WebsocketRoute) {
    throw Error(
      "Websocket: child routes are not supported for standalone routes"
    );
  }
}
