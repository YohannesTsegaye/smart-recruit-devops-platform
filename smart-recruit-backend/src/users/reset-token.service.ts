import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as crypto from 'crypto';

@Injectable()
export class ResetTokenService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async generateResetToken(user: User): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Token expires in 1 hour

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await this.usersRepository.save(user);

    return token;
  }

  async validateResetToken(token: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: MoreThan(new Date()),
      },
    });

    return user || null;
  }

  async clearResetToken(user: User): Promise<void> {
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.usersRepository.save(user);
  }
} 