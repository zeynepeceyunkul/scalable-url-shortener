import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../config/redis.module';
import { Link } from './entities/link.entity';
import { User } from '../users/entities/user.entity';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';

const BASE62 =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const CODE_LENGTH = 8;
const MAX_COLLISION_ATTEMPTS = 10;

@Injectable()
export class UrlService {
  constructor(
    @InjectRepository(Link)
    private readonly linkRepo: Repository<Link>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += BASE62[Math.floor(Math.random() * BASE62.length)];
    }
    return code;
  }

  private async reserveUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < MAX_COLLISION_ATTEMPTS; attempt++) {
      const code = this.generateCode();
      const existing = await this.linkRepo.findOne({ where: { code } });
      if (!existing) return code;
    }
    throw new Error('Could not generate unique short code');
  }

  async create(userId: string, dto: CreateLinkDto) {
    const code = await this.reserveUniqueCode();
    const link = this.linkRepo.create({
      userId,
      code,
      originalUrl: dto.originalUrl,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    const saved = await this.linkRepo.save(link);
    const shortUrl = this.buildShortUrl(code);
    return {
      code: saved.code,
      shortUrl,
      originalUrl: saved.originalUrl,
      expiresAt: saved.expiresAt,
      id: saved.id,
    };
  }

  async findAllByUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Link[]; total: number }> {
    const [data, total] = await this.linkRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findOne(id: string, user: User): Promise<Link> {
    const link = await this.linkRepo.findOne({ where: { id } });
    if (!link) throw new NotFoundException('Link not found');
    if (link.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('Not allowed to access this link');
    }
    return link;
  }

  async update(id: string, user: User, dto: UpdateLinkDto) {
    const link = await this.findOne(id, user);
    if (dto.isEnabled !== undefined) link.isEnabled = dto.isEnabled;
    if (dto.expiresAt !== undefined)
      link.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    await this.linkRepo.save(link);
    await this.invalidateCache(link.code);
    return link;
  }

  private buildShortUrl(code: string): string {
    const baseUrl = this.config.get<string>('app.baseUrl', 'http://localhost:3000');
    return `${baseUrl.replace(/\/$/, '')}/r/${code}`;
  }

  private cacheKey(code: string): string {
    return `short:${code}`;
  }

  private getRedirectTtl(): number {
    return this.config.get<number>('app.cache.redirectTtlSeconds', 3600);
  }

  async getRedirectTarget(code: string): Promise<string | null> {
    const key = this.cacheKey(code);
    const cached = await this.redis.get(key);
    if (cached) return cached;

    const link = await this.linkRepo.findOne({ where: { code } });
    if (!link) return null;
    if (!link.isEnabled) return null;
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return null;

    await this.redis.setex(key, this.getRedirectTtl(), link.originalUrl);
    return link.originalUrl;
  }

  async invalidateCache(code: string): Promise<void> {
    await this.redis.del(this.cacheKey(code));
  }
}
