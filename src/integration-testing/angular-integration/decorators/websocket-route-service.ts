import { WebsocketClient } from "../client/client";

export interface WebsocketRouteService {
  loadingElements: any;
  client: WebsocketClient;
}
