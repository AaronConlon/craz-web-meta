import { Context } from "hono";
import { ERROR_CODES, ErrorCode } from "../constants/error-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    details?: any;
  };
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: any
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

export function sendSuccess<T>(c: Context, data: T, status = 200) {
  return c.json(successResponse(data), status as ContentfulStatusCode);
}

export function sendError(
  c: Context,
  code: ErrorCode,
  message: string,
  details?: any,
  status = 200
) {
  return c.json(
    errorResponse(code, message, details),
    status as ContentfulStatusCode
  );
}

export function getErrorMessage(code: ErrorCode): string {
  const errorMessages: Record<ErrorCode, string> = {
    [ERROR_CODES.INTERNAL_SERVER_ERROR]: "服务器内部错误",
    [ERROR_CODES.INVALID_REQUEST]: "请求参数无效",
    [ERROR_CODES.UNAUTHORIZED]: "未授权访问",

    [ERROR_CODES.INVITE_CODE_EXPIRED]: "邀请码已过期",
    [ERROR_CODES.INVITE_CODE_INVALID]: "邀请码无效或已过期",
    [ERROR_CODES.INVITE_CODE_ALREADY_USED]: "邀请码已被使用",
    [ERROR_CODES.INVITE_CODE_EXPIRE_TIME_PAST]:
      "邀请码过期时间不能是过去的时间",
    [ERROR_CODES.INVITE_CODE_TOO_MANY]: "邀请码数量已达到上限",
    [ERROR_CODES.INVITE_CODE_CREATE_FAILED]: "创建邀请码失败",
    [ERROR_CODES.INVITE_CODE_VERIFY_FAILED]: "验证邀请码失败",
    [ERROR_CODES.INVITE_CODE_USE_FAILED]: "使用邀请码失败",

    [ERROR_CODES.TEAM_INVITES_FETCH_FAILED]: "获取团队邀请码失败",

    [ERROR_CODES.METADATA_INVALID_URL]: "无效的URL",
    [ERROR_CODES.METADATA_PARSE_FAILED]: "解析元数据失败",
    [ERROR_CODES.METADATA_REQUEST_TIMEOUT]: "请求超时",
    [ERROR_CODES.METADATA_CACHE_UNAVAILABLE]: "缓存服务不可用",
    [ERROR_CODES.METADATA_MISSING_REQUIRED_FIELDS]: "缺少必需的元数据字段",
    [ERROR_CODES.METADATA_INVALID_DATA]: "元数据无效",
  };

  return errorMessages[code] || "未知错误";
}
