import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

 @Column({ type: 'varchar', nullable: true })
previousEmail!: string | null;

  @Column()
  @Exclude()
  password!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.ADMIN
  })
  role!: UserRole;

  @Column({ 
    type: 'varchar', 
    default: 'Active',
    enum: ['Active', 'Inactive']
  })
  status!: string;

  @Column({ type: 'boolean', default: false })
  isTemporaryPassword!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  passwordExpiresAt!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  resetPasswordToken!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  resetPasswordExpires!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
} 