import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { validateEnvironment } from "./infrastructure/config/environment";
import { DocumentEntity } from "./infrastructure/persistence/document.entity";
import { OutboxEntity } from "./infrastructure/persistence/outbox.entity";
import { AuthModule } from "./infrastructure/auth/auth.module";
import { DocumentsModule } from "./infrastructure/documents/documents.module";
import { HealthController } from "./infrastructure/health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env", "../.env"], validate: validateEnvironment }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres" as const,
        host: config.get<string>("POSTGRES_HOST", "postgres"),
        port: Number(config.get<string>("POSTGRES_PORT", "5432")),
        username: config.getOrThrow<string>("POSTGRES_USER"),
        password: config.getOrThrow<string>("POSTGRES_PASSWORD"),
        database: config.getOrThrow<string>("POSTGRES_DB"),
        entities: [DocumentEntity, OutboxEntity],
        synchronize: process.env.NODE_ENV !== "production",
        retryAttempts: 20,
        retryDelay: 1500,
      }),
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? "redis",
        port: Number(process.env.REDIS_PORT ?? 6379),
        maxRetriesPerRequest: null,
      },
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    DocumentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}