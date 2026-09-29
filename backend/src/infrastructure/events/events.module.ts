import { Global, Module } from "@nestjs/common";
import { RedisStatusEvents } from "./redis-status-events.service";

@Global()
@Module({ providers: [RedisStatusEvents], exports: [RedisStatusEvents] })
export class EventsModule {}