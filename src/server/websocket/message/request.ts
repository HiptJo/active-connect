import { WebsocketConnection } from "../connection/connection";

export class WebsocketRequest {
  constructor(
    public path: string,
    public data: any,
    public connection: WebsocketConnection,
    public messageId?: number | null
  ) {
    if (!this.messageId) messageId = null;
  }
}
