import * as express from "express";

import {
  ClientIp,
  ClientIpMiddleware
} from "io-functions-commons/dist/src/utils/middlewares/client_ip_middleware";

import { RequiredParamMiddleware } from "io-functions-commons/dist/src/utils/middlewares/required_param";

import {
  AzureApiAuthMiddleware,
  IAzureApiAuthorization,
  UserGroup
} from "io-functions-commons/dist/src/utils/middlewares/azure_api_auth";
import {
  AzureUserAttributesMiddleware,
  IAzureUserAttributes
} from "io-functions-commons/dist/src/utils/middlewares/azure_user_attributes";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseErrorTooManyRequests,
  IResponseSuccessJson,
  ResponseSuccessJson
} from "italia-ts-commons/lib/responses";
import { OrganizationFiscalCode } from "italia-ts-commons/lib/strings";

import {
  checkSourceIpForHandler,
  clientIPAndCidrTuple as ipTuple
} from "io-functions-commons/dist/src/utils/source_ip_check";

import { Context } from "@azure/functions";
import { identity } from "fp-ts/lib/function";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { ServiceModel } from "io-functions-commons/dist/src/models/service";
import { ContextMiddleware } from "io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import { APIClient } from "../clients/admin";
import { Logo } from "../generated/api-admin/Logo";
import { withApiRequestWrapper } from "../utils/api";
import { getLogger, ILogger } from "../utils/logging";
import { ErrorResponses, IResponseErrorUnauthorized } from "../utils/responses";

type ResponseTypes =
  | IResponseSuccessJson<undefined>
  | IResponseErrorUnauthorized
  | IResponseErrorForbiddenNotAuthorized
  | IResponseErrorNotFound
  | IResponseErrorTooManyRequests
  | IResponseErrorInternal;

const logPrefix = "UploadOrganizationLogoHandler";

/**
 * Type of a UploadOrganizationLogoHandler handler.
 *
 * UploadOrganizationLogo expects an organization fiscal code and a logo as input
 * and returns informations about upload outcome
 */
type IUploadOrganizationLogoHandler = (
  context: Context,
  auth: IAzureApiAuthorization,
  clientIp: ClientIp,
  attrs: IAzureUserAttributes,
  organizationFiscalCode: OrganizationFiscalCode,
  logoPayload: Logo
) => Promise<ResponseTypes>;

const uploadOrganizationLogoTask = (
  logger: ILogger,
  apiClient: APIClient,
  organizationFiscalCode: OrganizationFiscalCode,
  logo: Logo
): TaskEither<ErrorResponses, IResponseSuccessJson<undefined>> =>
  withApiRequestWrapper(
    logger,
    () =>
      apiClient.uploadOrganizationLogo({
        body: logo,
        organization_fiscal_code: organizationFiscalCode
      }),
    201
  ).map(_ => ResponseSuccessJson(undefined));

/**
 * Handles requests for upload a service logo by a service ID and a base64 logo' s string.
 */
export function UploadOrganizationLogoHandler(
  apiClient: APIClient
): IUploadOrganizationLogoHandler {
  return (_, __, ___, ____, organizationFiscalCode, logoPayload) => {
    return uploadOrganizationLogoTask(
      getLogger(_, logPrefix, "UploadOrganizationLogo"),
      apiClient,
      organizationFiscalCode,
      logoPayload
    )
      .fold<ResponseTypes>(identity, identity)
      .run();
  };
}

/**
 * Wraps a UploadOrganizationLogo handler inside an Express request handler.
 */
export function UploadOrganizationLogo(
  serviceModel: ServiceModel,
  client: APIClient
): express.RequestHandler {
  const handler = UploadOrganizationLogoHandler(client);
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    AzureApiAuthMiddleware(new Set([UserGroup.ApiServiceWrite])),
    ClientIpMiddleware,
    AzureUserAttributesMiddleware(serviceModel),
    RequiredParamMiddleware("organization_fiscal_code", OrganizationFiscalCode),
    RequiredBodyPayloadMiddleware(Logo)
  );
  return wrapRequestHandler(
    middlewaresWrap(
      checkSourceIpForHandler(handler, (_, __, c, u, ___, ____) =>
        ipTuple(c, u)
      )
    )
  );
}
