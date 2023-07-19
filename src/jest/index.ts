/**
 * @module
 * @description
 * The `jest` module in Active-Connect provides several utilities for enhancing testing capabilities when creating tests using Jest.
 * This module exports the following functionalities:
 *  - `cron-tester`: A utility to manage scheduling and execution of Jest tests at specific intervals.
 *  - `fail`: An implementation of the `fail(...)` method, designed to assist in custom error reporting within tests.
 *  - `testEach`: A function that enables running Jest test blocks for multiple configurations, ideal for testing scenarios with different permissions where identical results are expected.
 *
 * @SetupInstructions
 * To enable the `fail` method within your Jest tests, follow these setup instructions:
 *
 * Step 1: Create the file "active-connect-setup.ts" in your project.
 *
 * Step 2: Add the following import statement to "active-connect-setup.ts":
 * ```javascript
 * import { failMethod } from "active-connect/dist/jest";
 * ```
 *
 * Step 3: Include "active-connect-setup.ts" in your Jest configuration under the `setupFilesAfterEnv` section. This step will ensure that the `fail` method is available in your test environment.
 *
 * Example Jest configuration:
 * ```json
 * // jest.config.js
 * module.exports = {
 *   // Other Jest configuration options...
 *   setupFilesAfterEnv: ["<rootDir>/active-connect-setup.ts"],
 * };
 * ```
 */

export * from "./jest-tools/test-each";
export * from "./jest-tools/fail";
export * from "./cron/cron-tester";
