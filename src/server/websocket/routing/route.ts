import { WebsocketConnection } from "../connection/connection";
import { WebsocketRequest } from "../message/request";
import { WebsocketResponse } from "../message/response";

export class WebsocketRoute {
  constructor(
    private method: string,
    private func: (
      data: any | void,
      connection: WebsocketConnection
    ) => void | WebsocketResponse
  ) {}

  public get Method(): string {
    return this.method;
  }

  public get Func(): (
    data: any | void,
    connection: WebsocketConnection
  ) => void | WebsocketResponse {
    return this.func;
  }

  private children: Array<WebsocketRoute> = [];
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
      const response = await this.call(request);
      if (typeof response != null) {
        request.connection.send(`m.${request.path}`, response);
      }
      return true;
    }

    // check for children
    if (
      path.length > 0 &&
      path[0] === this.method &&
      this.children &&
      this.children.length > 0
    ) {
      return this.routeChildren(request, path.slice(1));
    }
    return false;
  }
  private routeChildren(
    request: WebsocketRequest,
    path: Array<string>
  ): boolean {
    for (const child of this.children) {
      if (child.route(request, path)) {
        return true;
      }
    }
    return false;
  }

  private async call(request: WebsocketRequest): Promise<any> {
    return this.func(request.data, request.connection);
  }
}
