import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('blocked_times')
export class BlockedTime {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time', nullable: true })
  startTime: string;

  @Column({ type: 'time', nullable: true })
  endTime: string;

  @Column({ default: false, comment: 'If true, blocks the entire day' })
  isFullDay: boolean;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.blockedTimes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
