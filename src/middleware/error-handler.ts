import { ErrorHandler } from "hono";
import { ERROR_CODES } from "../constants/error-codes";
import { sendError, getErrorMessage } from "../utils/response";

export const errorHandler: ErrorHandler = (error, c) => {
  console.error(error);
  
  if (error instanceof Error) {
    if (error.message === "Request timeout") {
      return sendError(
        c,
        ERROR_CODES.METADATA_REQUEST_TIMEOUT,
        getErrorMessage(ERROR_CODES.METADATA_REQUEST_TIMEOUT)
      );
    }
    if (error.message.includes("Redis")) {
      return sendError(
        c,
        ERROR_CODES.METADATA_CACHE_UNAVAILABLE,
        getErrorMessage(ERROR_CODES.METADATA_CACHE_UNAVAILABLE)
      );
    }
  }
  
  return sendError(
    c,
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    getErrorMessage(ERROR_CODES.INTERNAL_SERVER_ERROR)
  );
};