import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'typeorm',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    username: process.env.DATABASE_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? 'postgres',
    database: process.env.DATABASE_NAME ?? 'url_shortener',
    autoLoadEntities: true,
    synchronize:
      process.env.DATABASE_SYNC === 'true' || process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  }),
);
