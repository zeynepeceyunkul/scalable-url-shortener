import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../src/modules/auth/auth.service";
import { UsersService } from "../src/modules/users/users.service";
import { User } from "../src/modules/users/entities/user.entity";

describe("AuthService", () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = {
    id: "user-uuid",
    email: "test@example.com",
    passwordHash: "$2b$12$hashed",
    role: "user",
    createdAt: new Date(),
    links: [],
  };

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      validatePassword: jest.fn(),
    };
    const mockJwtService = {
      sign: jest.fn().mockReturnValue("fake-jwt-token"),
    };
    const mockConfig = {
      get: jest.fn((key: string) =>
        key === "app.jwt.expiresIn" ? "15m" : undefined,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
  });

  it("should register a new user and return access token", async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue(mockUser);

    const result = await service.register({
      email: "test@example.com",
      password: "password123",
    });

    expect(usersService.create).toHaveBeenCalledWith(
      "test@example.com",
      "password123",
    );
    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: mockUser.id, email: mockUser.email },
      { expiresIn: "15m" },
    );
    expect(result.accessToken).toBe("fake-jwt-token");
    expect(result.user.email).toBe("test@example.com");
  });

  it("should login with valid credentials", async () => {
    usersService.findByEmail.mockResolvedValue(mockUser);
    usersService.validatePassword.mockResolvedValue(true);

    const result = await service.login({
      email: "test@example.com",
      password: "password123",
    });

    expect(usersService.validatePassword).toHaveBeenCalledWith(
      mockUser,
      "password123",
    );
    expect(result.accessToken).toBe("fake-jwt-token");
    expect(result.user.id).toBe(mockUser.id);
  });

  it("should throw UnauthorizedException on invalid password", async () => {
    usersService.findByEmail.mockResolvedValue(mockUser);
    usersService.validatePassword.mockResolvedValue(false);

    await expect(
      service.login({ email: "test@example.com", password: "wrong" }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("should throw UnauthorizedException when user not found on login", async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: "nonexistent@example.com", password: "pass" }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
