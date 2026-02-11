import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthResult {
  accessToken: string;
  user: { id: string; email: string; role: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const user = await this.usersService.create(dto.email, dto.password);
    return this.buildResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await this.usersService.validatePassword(user, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.buildResult(user);
  }

  async validateUser(payload: JwtPayload): Promise<User | null> {
    return this.usersService.findById(payload.sub);
  }

  private buildResult(user: User): AuthResult {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const expiresIn = this.config.get<string>('app.jwt.expiresIn', '15m');
    const accessToken = this.jwtService.sign(payload, { expiresIn });
    return {
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
