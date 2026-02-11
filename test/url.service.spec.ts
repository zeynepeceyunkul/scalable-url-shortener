import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { UrlService } from "../src/modules/url/url.service";
import { Link } from "../src/modules/url/entities/link.entity";
import { User } from "../src/modules/users/entities/user.entity";
import { REDIS_CLIENT } from "../src/config/redis.module";

describe("UrlService", () => {
  let service: UrlService;
  let linkRepo: jest.Mocked<Repository<Link>>;
  let redis: { get: jest.Mock; setex: jest.Mock; del: jest.Mock };

  const mockUser: User = {
    id: "user-1",
    email: "u@example.com",
    passwordHash: "hash",
    role: "user",
    createdAt: new Date(),
    links: [],
  };

  const mockLink: Link = {
    id: "link-1",
    userId: "user-1",
    code: "abc12345",
    originalUrl: "https://example.com",
    isEnabled: true,
    expiresAt: null,
    createdAt: new Date(),
    user: mockUser,
    clickStats: [],
  };

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };
    const mockRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const mockConfig = {
      get: jest.fn((key: string, def?: unknown) => {
        if (key === "app.baseUrl") return "http://localhost:3000";
        if (key === "app.cache.redirectTtlSeconds") return 3600;
        return def;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlService,
        { provide: getRepositoryToken(Link), useValue: mockRepo },
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<UrlService>(UrlService);
    linkRepo = module.get(getRepositoryToken(Link)) as jest.Mocked<
      Repository<Link>
    >;
  });

  describe("create (code generation collision)", () => {
    it("should create link with unique code when no collision", async () => {
      linkRepo.findOne.mockResolvedValue(null);
      linkRepo.create.mockReturnValue({
        ...mockLink,
        code: "xyz98765",
      } as Link);
      linkRepo.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: "link-1" } as Link),
      );

      const result = await service.create("user-1", {
        originalUrl: "https://example.com",
      });

      expect(result.code).toBeDefined();
      expect(result.shortUrl).toContain("/r/");
      expect(result.originalUrl).toBe("https://example.com");
      expect(linkRepo.save).toHaveBeenCalled();
    });

    it("should retry on code collision", async () => {
      let callCount = 0;
      linkRepo.findOne.mockImplementation(() => {
        callCount++;
        return Promise.resolve(
          callCount === 1 ? ({ code: "taken" } as Link) : null,
        );
      });
      linkRepo.create.mockReturnValue({ ...mockLink } as Link);
      linkRepo.save.mockImplementation((entity) =>
        Promise.resolve(entity as Link),
      );

      const result = await service.create("user-1", {
        originalUrl: "https://x.com",
      });

      expect(result.code).toBeDefined();
      expect(linkRepo.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe("getRedirectTarget", () => {
    it("should return cached URL on cache hit", async () => {
      redis.get.mockResolvedValue("https://cached.com");

      const target = await service.getRedirectTarget("abc12345");

      expect(target).toBe("https://cached.com");
      expect(linkRepo.findOne).not.toHaveBeenCalled();
    });

    it("should hit DB and cache on cache miss when link valid", async () => {
      redis.get.mockResolvedValue(null);
      linkRepo.findOne.mockResolvedValue(mockLink);

      const target = await service.getRedirectTarget("abc12345");

      expect(target).toBe("https://example.com");
      expect(redis.setex).toHaveBeenCalledWith(
        "short:abc12345",
        3600,
        "https://example.com",
      );
    });

    it("should return null when link disabled", async () => {
      redis.get.mockResolvedValue(null);
      linkRepo.findOne.mockResolvedValue({ ...mockLink, isEnabled: false });

      const target = await service.getRedirectTarget("abc12345");

      expect(target).toBeNull();
    });

    it("should return null when link expired", async () => {
      redis.get.mockResolvedValue(null);
      linkRepo.findOne.mockResolvedValue({
        ...mockLink,
        expiresAt: new Date(Date.now() - 86400000),
      });

      const target = await service.getRedirectTarget("abc12345");

      expect(target).toBeNull();
    });

    it("should return null when code not found", async () => {
      redis.get.mockResolvedValue(null);
      linkRepo.findOne.mockResolvedValue(null);

      const target = await service.getRedirectTarget("nonexistent");

      expect(target).toBeNull();
    });
  });

  describe("findOne", () => {
    it("should return link for owner", async () => {
      linkRepo.findOne.mockResolvedValue(mockLink);

      const link = await service.findOne("link-1", mockUser);

      expect(link.id).toBe("link-1");
    });

    it("should throw NotFoundException when link missing", async () => {
      linkRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne("missing", mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when not owner and not admin", async () => {
      linkRepo.findOne.mockResolvedValue({ ...mockLink, userId: "other-user" });
      const otherUser = {
        ...mockUser,
        id: "other-user",
        role: "user" as const,
      };

      await expect(service.findOne("link-1", otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
