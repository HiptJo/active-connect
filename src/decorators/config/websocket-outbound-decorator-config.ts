import { MessageFilter } from "../../server";
import { WebsocketDecoratorConfig } from "./decorator-config";

/**
 * Contains configuration used during the initialization phase to ensure different decorators work together.
 * Used to store configuration for outbound. The configuration is then loaded once the server is started.
 */
export class WebsocketOutboundDecoratorConfig extends WebsocketDecoratorConfig {
  /**
   * Initializes the decorator config for a method.
   * @param target - Class target.
   * @param propertyKey - Name of the method.
   */
  static init(target: any, propertyKey?: string) {
    var prototype = target.prototype || target;
    if (!prototype.___out) {
      prototype.___out = {};
    }
    if (!prototype.___out.outbounds) {
      prototype.___out.outbounds = [];
    }

    if (!prototype.___out.config) {
      prototype.___out.config = {};
    }
    if (!prototype.___out.config[propertyKey]) {
      prototype.___out.config[propertyKey] =
        new WebsocketOutboundDecoratorConfig();
    }
  }

  /**
   * Returns the decorator configuration for the specified method.
   * @param target - The class target.
   * @param propertyKey - The name of the method.
   * @returns The decorator configuration for the method.
   */
  static get(
    target: any,
    propertyKey?: string
  ): WebsocketOutboundDecoratorConfig {
    var prototype = target.prototype || target;
    WebsocketOutboundDecoratorConfig.init(target, propertyKey);
    return prototype.___out.config[propertyKey];
  }

  /**
   * If outbound subscription mode is enabled.
   */
  public subscriptionEnabled: boolean = false;

  /**
   * If outbound subscription for filter is enabled.
   */
  public subscriptionsFor: MessageFilter[] = [];

  /**
   * Enables outbound subscription mode.
   */
  public enableSubscription() {
    this.subscriptionEnabled = true;
  }

  /**
   * Enables filtered subscription mode.
   * @param filter - Filter used for subscription.
   */
  public addSubscriptionFor(filter: MessageFilter) {
    this.subscriptionsFor.push(filter);
  }

  /**
   * Defines whether the outbound should automatically be re-sent after an auth change.
   */
  public resendAfterAuthenticationChange: boolean = false;

  /**
   * Defines whether the outbound should use lazy or eager loading.
   */
  public lazyLoading: boolean = false;
}
