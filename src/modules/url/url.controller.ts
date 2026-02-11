import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UrlService } from './url.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';

@Controller('links')
@UseGuards(JwtAuthGuard)
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit({ keyPrefix: 'rl:user', limit: 30 })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateLinkDto,
  ) {
    return this.urlService.create(user.id, dto);
  }

  @Get()
  async list(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, parseInt(page ?? '1', 10));
    const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10)));
    return this.urlService.findAllByUser(user.id, p, l);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateLinkDto,
  ) {
    return this.urlService.update(id, user, dto);
  }
}
