import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('clients')
@Index(['userId', 'phone'], { unique: true })
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column()
  phone: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: 0 })
  totalAppointments: number;

  @Column({ default: 0 })
  completedAppointments: number;

  @Column({ default: 0 })
  cancelledAppointments: number;

  @Column({ default: 0 })
  noShowAppointments: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAppointmentAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
