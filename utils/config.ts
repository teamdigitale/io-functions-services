/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */

import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { MailerConfig } from "@pagopa/io-functions-commons/dist/src/mailer";
import * as t from "io-ts";
import { readableReport } from "italia-ts-commons/lib/reporters";
import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { CommaSeparatedListOf } from "./comma-separated-list";

// global app configuration
export type IConfig = t.TypeOf<typeof IConfig>;
export const IConfig = t.intersection([
  t.interface({
    APPINSIGHTS_INSTRUMENTATIONKEY: NonEmptyString,

    COSMOSDB_KEY: NonEmptyString,
    COSMOSDB_NAME: NonEmptyString,
    COSMOSDB_URI: NonEmptyString,

    DEFAULT_SUBSCRIPTION_PRODUCT_NAME: NonEmptyString,

    EMAIL_NOTIFICATION_SERVICE_BLACKLIST: CommaSeparatedListOf(ServiceId),
    WEBHOOK_NOTIFICATION_SERVICE_BLACKLIST: CommaSeparatedListOf(ServiceId),

    IO_FUNCTIONS_ADMIN_API_TOKEN: NonEmptyString,
    IO_FUNCTIONS_ADMIN_BASE_URL: NonEmptyString,

    MESSAGE_CONTAINER_NAME: NonEmptyString,

    QueueStorageConnection: NonEmptyString,

    SANDBOX_FISCAL_CODE: NonEmptyString,
    SUBSCRIPTIONS_FEED_TABLE: NonEmptyString,

    WEBHOOK_CHANNEL_URL: NonEmptyString,

    isProduction: t.boolean
  }),
  MailerConfig
]);

// No need to re-evaluate this object for each call
const errorOrConfig: t.Validation<IConfig> = IConfig.decode({
  ...process.env,
  isProduction: process.env.NODE_ENV === "production"
});

/**
 * Read the application configuration and check for invalid values.
 * Configuration is eagerly evalued when the application starts.
 *
 * @returns either the configuration values or a list of validation errors
 */
export function getConfig(): t.Validation<IConfig> {
  return errorOrConfig;
}

/**
 * Read the application configuration and check for invalid values.
 * If the application is not valid, raises an exception.
 *
 * @returns the configuration values
 * @throws validation errors found while parsing the application configuration
 */
export function getConfigOrThrow(): IConfig {
  return errorOrConfig.getOrElseL(errors => {
    throw new Error(`Invalid configuration: ${readableReport(errors)}`);
  });
}
