import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "documents" })
export class DocumentEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "owner_id", type: "uuid" })
  ownerId!: string;

  @Column({ type: "varchar", length: 240 })
  title!: string;

  @Column({ type: "varchar", length: 160 })
  author!: string;

  @Column({ type: "varchar", length: 120 })
  category!: string;

  @Column({ type: "text", array: true, default: "{}" })
  tags!: string[];

  @Column({ type: "varchar", length: 80 })
  version!: string;

  @Column({ name: "storage_path", type: "text" })
  storagePath!: string;

  @Column({ name: "original_name", type: "varchar", length: 255 })
  originalName!: string;

  @Column({ name: "media_type", type: "varchar", length: 80 })
  mediaType!: string;

  @Column({ type: "varchar", length: 16, default: "PROCESSING" })
  status!: "PROCESSING" | "INDEXED" | "ERROR";

  @Column({ name: "extracted_text", type: "text", nullable: true })
  extractedText!: string | null;

  @Column({ type: "text", nullable: true })
  error!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}