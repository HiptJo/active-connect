import { WebsocketConnection } from "../connection/connection";
import { WebsocketRequest } from "../message/request";
import { WebsocketOutbound } from "./outbound";

export class WebsocketRoute {
  protected method: string;
  constructor(
    method: string,
    protected objConfig: { target: any; propertyKey: string },
    private modifiesAuthentication?: boolean
  ) {
    this.Method = method;
  }

  public get Method(): string {
    return this.method;
  }
  public set Method(method: string) {
    if (method.indexOf(".") >= 0)
      throw Error(
        `Websocket Routing: method must not contain a separator "." in method "${this.method}"`
      );
    this.method = method;
  }

  private getBindObject(): any {
    if (!this.objConfig.target.___data?._obj) {
      if (!this.objConfig.target.___data) {
        this.objConfig.target.___data = {};
      }
      this.objConfig.target.___data._obj =
        new this.objConfig.target.constructor();
    }
    return this.objConfig.target.___data._obj;
  }

  public get Func(): (
    data: any | void,
    connection: WebsocketConnection
  ) => Function {
    if (
      this.objConfig?.target &&
      this.objConfig.target[this.objConfig.propertyKey]
    )
      return this.objConfig.target[this.objConfig.propertyKey].bind(
        this.getBindObject()
      );
    return null;
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
    // check if responsible for handling
    if (path.length === 1 && path[0] === this.method) {
      const res = await this.call(request);
      if (
        !(res && res.toString().startsWith("auth:unauthorized")) &&
        !(res && res.toString().startsWith("error:auth:unauthorized"))
      ) {
        request.connection.send(
          `m.${request.path}`,
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
        if (this.modifiesAuthentication)
          WebsocketOutbound.resendDataAfterAuth(request.connection).then();
        return data;
      } catch (e) {
        request.connection.send("m.error", e?.message || e);
        if (!process.env.jest) throw e;
      }
    } else
      throw Error("Websocket: Function not defined for route " + this.method);
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
    if (request.path === this.method) {
      const res = await this.call(request);
      if (
        !(res && res.toString().startsWith("auth:unauthorized")) &&
        !(res && res.toString().startsWith("error:auth:unauthorized"))
      ) {
        request.connection.send(
          `m.${request.path}`,
          res,
          request.messageId || -1
        );
      }
      return true;
    }

    return false;
  }
}
