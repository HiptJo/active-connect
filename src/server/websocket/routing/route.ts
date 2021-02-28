import { WebsocketConnection } from "../connection/connection";
import { WebsocketRequest } from "../message/request";
import { WebsocketOutbound } from "./outbound";

export class WebsocketRoute {
  protected method: string;
  constructor(
    method: string,
    protected func:
      | ((data: any | void, connection: WebsocketConnection) => void | any)
      | null,
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
        `Websocket Routing: method must not contain a separator (.) ${this.method}`
      );
    this.method = method;
  }

  public get Func(): (
    data: any | void,
    connection: WebsocketConnection
  ) => void {
    return this.func;
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
        res &&
        !res.toString().startsWith("auth:unauthorized") &&
        !res.toString().startsWith("error:auth:unauthorized")
      ) {
        request.connection.send(`m.${request.path}`, res);
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
    if (this.func) {
      try {
        const data = await this.func(request.data, request.connection);
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
