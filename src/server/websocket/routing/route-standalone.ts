import { WebsocketRequest } from "../message/request";
import { WebsocketRoute } from "./route";

export class StandaloneWebsocketRoute extends WebsocketRoute {
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
      const response = await this.call(request);
      if (response != "error:auth:unauthorized") {
        request.connection.send(`m.${request.path}`, response);
      }
      return true;
    }

    return false;
  }
}
