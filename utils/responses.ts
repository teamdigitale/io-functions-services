import * as express from "express";
import * as t from "io-ts";
import { errorsToReadableMessages } from "italia-ts-commons/lib/reporters";
import { IResponseType } from "italia-ts-commons/lib/requests";
import {
  HttpStatusCodeEnum,
  IResponse,
  IResponseErrorForbiddenNotAuthorized,
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseErrorTooManyRequests,
  ResponseErrorForbiddenNotAuthorized,
  ResponseErrorGeneric,
  ResponseErrorInternal,
  ResponseErrorNotFound,
  ResponseErrorTooManyRequests,
  ResponseErrorValidation
} from "italia-ts-commons/lib/responses";

/**
 * Interface for a no content response returning a empty object.
 */
export interface IResponseNoContent extends IResponse<"IResponseNoContent"> {
  readonly value: {};
}
/**
 * Returns a no content json response.
 */
export function ResponseNoContent(): IResponseNoContent {
  return {
    apply: (res: express.Response) => res.status(204).json({}),
    kind: "IResponseNoContent",
    value: {}
  };
}

/**
 * Transforms async failures into internal errors
 */
export const withCatchAsInternalError = <T>(
  f: () => Promise<T>,
  message: string = "Exception while calling upstream API (likely a timeout)."
) =>
  f().catch(_ => {
    // tslint:disable-next-line:no-console
    console.error(_);
    return ResponseErrorInternal(`${message} [${_}]`);
  });

export const unhandledResponseStatus = (status: number) =>
  ResponseErrorInternal(`unhandled API response status [${status}]`);

/**
 * Calls the provided function with the valid response, or else returns an
 * IResponseErrorInternal with the validation errors.
 */
export const withValidatedOrInternalError = <T, U>(
  validated: t.Validation<T>,
  f: (t: T) => U
) =>
  validated.isLeft()
    ? ResponseErrorInternal(
        errorsToReadableMessages(validated.value).join(" / ")
      )
    : f(validated.value);

/**
 * Calls the provided function with the valid response, or else returns an
 * IResponseErrorValidation with the validation errors.
 */
export const withValidatedOrValidationError = <T, U>(
  response: t.Validation<T>,
  f: (t: T) => U
) =>
  response.isLeft()
    ? ResponseErrorValidation(
        "Bad request",
        errorsToReadableMessages(response.value).join(" / ")
      )
    : f(response.value);

/**
 * Interface for unauthorized error response.
 */
export interface IResponseErrorUnauthorized
  extends IResponse<"IResponseErrorUnauthorized"> {
  readonly detail: string;
}
/**
 * Returns an unauthorized error response with status code 401.
 */
export function ResponseErrorUnauthorized(
  title: string,
  detail: string
): IResponseErrorUnauthorized {
  return {
    ...ResponseErrorGeneric(HttpStatusCodeEnum.HTTP_STATUS_401, title, detail),
    ...{
      detail: `${title}: ${detail}`,
      kind: "IResponseErrorUnauthorized"
    }
  };
}

export type ErrorResponses =
  | IResponseErrorNotFound
  | IResponseErrorUnauthorized
  | IResponseErrorForbiddenNotAuthorized
  | IResponseErrorInternal
  | IResponseErrorTooManyRequests;

export const toErrorServerResponse = <S extends number, T>(
  response: IResponseType<S, T>
) => {
  if (response.status === 401) {
    return ResponseErrorUnauthorized("Unauthorized", "Unauthorized");
  }

  if (response.status === 403) {
    return ResponseErrorForbiddenNotAuthorized;
  }

  if (response.status === 404) {
    return ResponseErrorNotFound("Not found", "Resource not found");
  }

  if (response.status === 429) {
    return ResponseErrorTooManyRequests("Too many requests");
  }

  return unhandledResponseStatus(response.status);
};
