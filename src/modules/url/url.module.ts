import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Link } from './entities/link.entity';
import { LinkClickDaily } from './entities/link-click-daily.entity';
import { UrlController } from './url.controller';
import { RedirectController } from './redirect.controller';
import { UrlService } from './url.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Link, LinkClickDaily]),
  ],
  controllers: [UrlController, RedirectController],
  providers: [UrlService],
  exports: [UrlService],
})
export class UrlModule {}
