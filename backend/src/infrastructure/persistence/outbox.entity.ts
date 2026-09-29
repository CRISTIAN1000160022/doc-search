import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "outbox_events" })
export class OutboxEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "aggregate_id", type: "uuid" })
  aggregateId!: string;

  @Column({ name: "event_type", type: "varchar", length: 80 })
  eventType!: string;

  @Column({ type: "jsonb" })
  payload!: Record<string, string>;

  @Column({ name: "processed_at", type: "timestamptz", nullable: true })
  processedAt!: Date | null;

  @Column({ name: "attempts", type: "integer", default: 0 })
  attempts!: number;

  @Column({ name: "next_attempt_at", type: "timestamptz", default: () => "now()" })
  nextAttemptAt!: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}