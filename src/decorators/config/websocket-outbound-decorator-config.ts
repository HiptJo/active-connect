import { MessageFilter } from "../../server";
import { WebsocketDecoratorConfig } from "./websocket-decorator-config";

export class WebsocketOutboundDecoratorConfig extends WebsocketDecoratorConfig {
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

  static get(
    target: any,
    propertyKey?: string
  ): WebsocketOutboundDecoratorConfig {
    var prototype = target.prototype || target;
    WebsocketOutboundDecoratorConfig.init(target, propertyKey);
    return prototype.___out.config[propertyKey];
  }

  public subscriptionEnabled: boolean = false;
  public subscriptionsFor: MessageFilter[] = [];

  public enableSubscription() {
    this.subscriptionEnabled = true;
  }

  public addSubscriptionFor(filter: MessageFilter) {
    this.subscriptionsFor.push(filter);
  }

  public resendAfterAuthenticationChange: boolean = false;
  public lazyLoading: boolean = false;
}
