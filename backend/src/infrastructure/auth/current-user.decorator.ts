import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

interface UserRequest extends Request {
  user: { sub: string; username: string };
}

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest<UserRequest>().user;
});