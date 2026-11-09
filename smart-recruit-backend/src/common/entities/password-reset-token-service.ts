import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetToken } from './password-reset-token.entity';
import { User } from '../../users/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class PasswordResetTokenService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private tokenRepository: Repository<PasswordResetToken>,
  ) {}

  async generateToken(user: User): Promise<PasswordResetToken> {
    // Delete any existing tokens for this user
    await this.tokenRepository.delete({ user: { id: user.id } });

    // Generate a new token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    const resetToken = this.tokenRepository.create({
      token,
      user,
      expiresAt,
    });

    return this.tokenRepository.save(resetToken);
  }

  async validateToken(token: string): Promise<PasswordResetToken | null> {
    const resetToken = await this.tokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      return null;
    }

    return resetToken;
  }

  async deleteToken(token: string): Promise<void> {
    await this.tokenRepository.delete({ token });
  }
} 