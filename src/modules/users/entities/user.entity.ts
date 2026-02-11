import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { Link } from "../../url/entities/link.entity";

export type UserRole = "user" | "admin";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: "password_hash" })
  passwordHash: string;

  @Column({ type: "varchar", length: 10, default: "user" })
  role: UserRole;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @OneToMany(() => Link, (link) => link.user)
  links: Link[];
}
