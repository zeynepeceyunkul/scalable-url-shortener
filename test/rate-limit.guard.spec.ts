import { ExecutionContext, HttpStatus } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { RateLimitGuard } from "../src/common/guards/rate-limit.guard";

describe("RateLimitGuard", () => {
  let guard: RateLimitGuard;
  let redis: { incr: jest.Mock; expire: jest.Mock };
  let reflector: jest.Mocked<Reflector>;

  const createMockContext = (
    overrides: Partial<{
      user: unknown;
      ip: string;
      headers: Record<string, string>;
    }> = {},
  ): ExecutionContext => {
    const request = {
      user: overrides.user,
      ip: overrides.ip ?? "192.168.1.1",
      headers: overrides.headers ?? {},
      socket: { remoteAddress: "192.168.1.1" },
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    redis = { incr: jest.fn(), expire: jest.fn() };
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    const config = { get: jest.fn() };
    guard = new RateLimitGuard(
      redis as unknown as Redis,
      reflector,
      config as unknown as ConfigService,
    );
  });

  it("should allow request when under limit", async () => {
    reflector.getAllAndOverride.mockReturnValue({
      keyPrefix: "rl:ip",
      limit: 120,
    });
    redis.incr.mockResolvedValue(1);

    const ctx = createMockContext();
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(redis.incr).toHaveBeenCalled();
    expect(redis.expire).toHaveBeenCalled();
  });

  it("should throw 429 when over limit", async () => {
    reflector.getAllAndOverride.mockReturnValue({
      keyPrefix: "rl:ip",
      limit: 120,
    });
    redis.incr.mockResolvedValue(121);

    const ctx = createMockContext();

    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
      response: { message: "Too many requests. Please try again later." },
    });
  });

  it("should pass when no rate limit metadata", async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const ctx = createMockContext();
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(redis.incr).not.toHaveBeenCalled();
  });

  it("should use user id for rl:user prefix", async () => {
    reflector.getAllAndOverride.mockReturnValue({
      keyPrefix: "rl:user",
      limit: 30,
    });
    redis.incr.mockResolvedValue(1);

    const ctx = createMockContext({ user: { id: "user-123" } });
    await guard.canActivate(ctx);

    expect(redis.incr).toHaveBeenCalledWith(
      expect.stringMatching(/^rl:user:user-123:\d+$/),
    );
  });
});
