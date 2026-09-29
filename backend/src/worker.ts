import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module";

async function bootstrapWorker(): Promise<void> {
  await NestFactory.createApplicationContext(WorkerModule, { logger: ["error", "warn", "log"] });
}

void bootstrapWorker();