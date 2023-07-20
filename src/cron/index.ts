/**
 * @module
 * @description
 * The `cron` module in Active-Connect enables developers to create cronjobs using the `@Cron` decorator. By utilizing the `@Cron` decorator, developers can easily define and schedule tasks to run at specified intervals.

 * Example:
 * ```javascript
 * @Cron("0 * * * *")
 * async runTask() {
 *    // run scheduled tasks
 * }
 * ```
 *
 * **Note:** The `cron` module uses the node-cron library internally for handling cronjobs. You can find more details about node-cron at {@link https://www.npmjs.com/package/node-cron}.
 *
 * For integration tests for cronjobs, please refer to the {@link jest} section, where details on implementing integration tests are provided.
 */

export * from "./decorators/cron";
