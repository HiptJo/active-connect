import { MessageFilter } from "../../server";
import { DecoratorConfig } from "./decorator-config";

/**
 * Contains configuration used during the initialization phase to ensure different decorators work together.
 * Used to store configuration for WebSocket route decorators. The configuration is then loaded once the server is started.
 */
export class WebsocketRouteDecoratorConfig extends DecoratorConfig {
  /**
   * Initializes the decorator config for a method.
   * @param target - Class target.
   * @param propertyKey - Name of the method.
   */
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

  /**
   * Returns the decorator configuration for the specified method.
   * @param target - The class target.
   * @param propertyKey - The name of the method.
   * @returns The decorator configuration for the method.
   */
  static get(target: any, propertyKey?: string): WebsocketRouteDecoratorConfig {
    WebsocketRouteDecoratorConfig.init(target, propertyKey);
    var prototype = target.prototype || target;
    return prototype.___route.config[propertyKey];
  }

  /**
   * The list of modifies outbounds affected by the method.
   */
  public modifies: string[] = [];
  /**
   * The list of modified outbounds affected by the method for filtered subscriptions.
   */
  public modifiesFor: { filter: MessageFilter; outbounds: string[] }[] = [];

  /**
   * States that data contained within these outbounds might be changed during the execution of this route.
   * @param items - The items to add to the list of modified outbounds.
   */
  public addModifies(...items: string[]) {
    this.modifies.push(...items);
  }

  /**
   * States that data contained within these outbounds might be changed during the execution of this route.
   * @param filter - The message filter used to determine which connection's data needs to be updated.
   * @param items - The items to add to the list of modified outbounds.
   */
  public addModifiesFor(filter: MessageFilter, ...items: string[]) {
    this.modifiesFor.push({ filter, outbounds: items });
  }

  /**
   * Indicates whether the method modifies authentication.
   */
  public modifiesAuthentication: boolean = false;
}
