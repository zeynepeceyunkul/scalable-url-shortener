import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { LinkClickDaily } from "./link-click-daily.entity";

@Entity("links")
export class Link {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @ManyToOne(() => User, (user) => user.links, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ unique: true })
  code: string;

  @Column({ name: "original_url" })
  originalUrl: string;

  @Column({ name: "is_enabled", default: true })
  isEnabled: boolean;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @OneToMany(() => LinkClickDaily, (daily) => daily.link)
  clickStats: LinkClickDaily[];
}
