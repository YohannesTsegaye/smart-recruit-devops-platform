import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: 5432,
        username: 'postgres',
        password: '12345678',
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: configService.get<string>('NODE_ENV') === 'development',
        extra:
          configService.get<string>('NODE_ENV') === 'production'
            ? { ssl: { rejectUnauthorized: false } }
            : undefined,
      }),
    }),
  ],
})
export class DatabaseModule {}
