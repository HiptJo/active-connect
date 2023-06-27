import { MessageFilter } from "../../../server";
import { WebsocketDecoratorConfig } from "./websocket-decorator-config";

export class WebsocketOutboundDecoratorConfig extends WebsocketDecoratorConfig {
  static init(target: any, propertyKey?: string) {
    if (!target.prototype.___out) {
      target.prototype.___out = {};
    }
    if (!target.prototype.___out.outbounds) {
      target.prototype.___out.outbounds = [];
    }

    if (!target.prototype.___out.config) {
      target.prototype.___out.config = {};
    }
    if (!target.prototype.___out.config[propertyKey]) {
      target.prototype.___out.config[propertyKey] =
        new WebsocketOutboundDecoratorConfig();
    }
  }

  static get(
    target: any,
    propertyKey?: string
  ): WebsocketOutboundDecoratorConfig {
    WebsocketOutboundDecoratorConfig.init(target, propertyKey);
    return target.prototype.___out.config[propertyKey];
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
