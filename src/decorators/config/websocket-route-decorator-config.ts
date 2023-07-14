import { MessageFilter } from "../../server";
import { WebsocketDecoratorConfig } from "./websocket-decorator-config";

export class WebsocketRouteDecoratorConfig extends WebsocketDecoratorConfig {
  static init(target: any, propertyKey?: string) {
    var prototype = target.prototype || target;
    if (!prototype.___route) {
      prototype.___route = {};
    }
    if (!prototype.___route.children) {
      prototype.___route.children = [];
    }

    if (!prototype.___route.config) {
      prototype.___route.config = {};
    }
    if (!prototype.___route.config[propertyKey]) {
      prototype.___route.config[propertyKey] =
        new WebsocketRouteDecoratorConfig();
    }
  }

  static get(target: any, propertyKey?: string): WebsocketRouteDecoratorConfig {
    WebsocketRouteDecoratorConfig.init(target, propertyKey);
    var prototype = target.prototype || target;
    return prototype.___route.config[propertyKey];
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
