import { MessageFilter } from "../../../server";
import { WebsocketDecoratorConfig } from "./websocket-decorator-config";

export class WebsocketRouteDecoratorConfig extends WebsocketDecoratorConfig {
  static init(target: any, propertyKey?: string) {
    if (!target.prototype.___route) {
      target.prototype.___route = {};
    }
    if (!target.prototype.___route.children) {
      target.prototype.___route.children = [];
    }

    if (!target.prototype.___route.config) {
      target.prototype.___route.config = {};
    }
    if (!target.prototype.___route.config[propertyKey]) {
      target.prototype.___route.config[propertyKey] =
        new WebsocketRouteDecoratorConfig();
    }
  }

  static get(target: any, propertyKey?: string): WebsocketRouteDecoratorConfig {
    WebsocketRouteDecoratorConfig.init(target, propertyKey);
    return target.prototype.___route.config[propertyKey];
  }

  public modifies: string[] = [];
  public modifiesFor: { filter: MessageFilter; outbounds: string[] }[] = [];

  public addModifies(...items: string[]) {
    this.modifies.push(...items);
  }

  public addModifiesFor(filter: MessageFilter, ...items: string[]) {
    this.modifiesFor.push({ filter, outbounds: items });
  }

  public modifiesAuthentication: boolean = false;
}
