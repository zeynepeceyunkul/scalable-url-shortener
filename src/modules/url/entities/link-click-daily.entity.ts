import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Link } from "./link.entity";

@Entity("link_click_daily")
export class LinkClickDaily {
  @PrimaryColumn({ name: "link_id" })
  linkId: string;

  @PrimaryColumn({ type: "date" })
  day: string;

  @Column({ default: 0 })
  clicks: number;

  @ManyToOne(() => Link, (link) => link.clickStats, { onDelete: "CASCADE" })
  @JoinColumn({ name: "link_id" })
  link: Link;
}
