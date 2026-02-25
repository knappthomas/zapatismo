import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts a property from request.user (set by JWT strategy).
 * Usage: @RequestUser() user => full user, or @RequestUser('id') userId => number
 */
export const RequestUser = createParamDecorator(
  (key: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return key ? user?.[key] : user;
  },
);
