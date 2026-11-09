import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CandidateStatus {
  UNDER_REVIEW = 'Under Review',
  RECEIVED = 'Received',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
  INTERVIEW = 'Interview',
  CALL_FOR_EXAM = 'Call for exam',
}

@Entity('candidates')
export class Candidate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  fullname!: string;

  @Column()
  email!: string;

  @Column({ nullable: true })
  link?: string;

  @Column('decimal', { precision: 3, scale: 2 })
  gpa!: number;

  @Column({ nullable: true })
  resumepath?: string;

  @Column()
  experience!: string;

  @Column()
  skills!: string;

  @Column('text')
  coverletter!: string;

  @Column()
  jobTitle!: string;

  @Column()
  location!: string;

  @Column()
  department!: string;

  @Column({
    type: 'enum',
    enum: CandidateStatus,
    default: CandidateStatus.RECEIVED,
  })
  status!: CandidateStatus;

  @Column({ type: 'varchar', length: 13 })
  phoneNumber!: string;

  @CreateDateColumn()
  appliedDate!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
