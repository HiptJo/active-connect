import { WebsocketConnection } from "../../../active-connect";
import { WebsocketRequest } from "../message/request";
import { WebsocketRoute } from "./route";

export class StandaloneWebsocketRoute extends WebsocketRoute {
  constructor(
    method: string,
    func:
      | ((data: any | void, connection: WebsocketConnection) => void | any)
      | null,
    modifiesAuthentication?: boolean
  ) {
    super(method, func, modifiesAuthentication);
    this.Method = method;
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
        res &&
        !res.toString().startsWith("auth:unauthorized") &&
        !res.toString().startsWith("error:auth:unauthorized")
      ) {
        request.connection.send(`m.${request.path}`, res);
      }
      return true;
    }

    return false;
  }
}
