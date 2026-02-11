import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import Redis from "ioredis";
import { REDIS_CLIENT } from "../../config/redis.module";
import { ConfigService } from "@nestjs/config";
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from "../decorators/rate-limit.decorator";
import { User } from "../../modules/users/entities/user.entity";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<
      RateLimitOptions | undefined
    >(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
    if (!options) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const windowSeconds = options.windowSeconds ?? 60;
    const minuteBucket = Math.floor(Date.now() / 1000 / windowSeconds);

    let key: string;
    if (options.keyPrefix === "rl:ip") {
      const ip = this.getClientIp(request);
      key = `${options.keyPrefix}:${ip}:${minuteBucket}`;
    } else {
      const user = request.user as User | undefined;
      const id = user?.id ?? request.ip ?? "anonymous";
      key = `${options.keyPrefix}:${id}:${minuteBucket}`;
    }

    const limit = options.limit;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSeconds * 2);
    }

    if (count > limit) {
      throw new HttpException(
        {
          message: "Too many requests. Please try again later.",
          statusCode: 429,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private getClientIp(request: Request): string {
    const xff = request.headers["x-forwarded-for"];
    if (typeof xff === "string") {
      return xff.split(",")[0].trim();
    }
    return request.ip ?? request.socket?.remoteAddress ?? "127.0.0.1";
  }
}
