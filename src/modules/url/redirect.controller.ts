import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { UrlService } from './url.service';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { UseGuards } from '@nestjs/common';

@Controller('r')
@Public()
export class RedirectController {
  constructor(private readonly urlService: UrlService) {}

  @Get(':code')
  @UseGuards(RateLimitGuard)
  @RateLimit({ keyPrefix: 'rl:ip', limit: 120 })
  async redirect(@Param('code') code: string, @Res() res: Response) {
    const target = await this.urlService.getRedirectTarget(code);
    if (!target) {
      throw new NotFoundException('Link not found or expired');
    }
    return res.redirect(302, target);
  }
}
