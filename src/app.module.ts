import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { UrlModule } from "./modules/url/url.module";
import { RedisModule } from "./config/redis.module";
import { JwtAuthGuard } from "./modules/auth/jwt-auth.guard";
import { AppController } from "./app.controller";
import appConfig from "./config/app.config";
import typeormConfig from "./config/typeorm.config";

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, typeormConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get("typeorm") as ReturnType<typeof typeormConfig>,
      inject: [ConfigService],
    }),
    RedisModule,
    AuthModule,
    UsersModule,
    UrlModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
