import { DecoratorConfig } from "../../decorator-config/decorator-config";

/**
 * Contains configuration used during the initialization phase to ensure different decorators work together.
 * Used to store configuration for content providers. The configuration is then loaded once the server is started.
 */
export class ContentProviderDecoratorConfig extends DecoratorConfig {
  /**
   * Initializes the decorator config for a method.
   * @param target - Class target.
   * @param propertyKey - Name of the method.
   */
  static init(target: any, propertyKey?: string) {
    var prototype = target.prototype || target;
    if (!prototype.___content) {
      prototype.___content = {};
    }
    if (!prototype.___content.config) {
      prototype.___content.config = {};
    }
    if (!prototype.___content.config[propertyKey]) {
      prototype.___content.config[propertyKey] =
        new ContentProviderDecoratorConfig();
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
  ): ContentProviderDecoratorConfig {
    var prototype = target.prototype || target;
    ContentProviderDecoratorConfig.init(target, propertyKey);
    return prototype.___content.config[propertyKey];
  }
}
