import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { PasswordResetTokenService } from '../common/entities/password-reset-token-service';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  email: string;
  sub: number;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private passwordResetTokenService: PasswordResetTokenService,
    private emailService: EmailService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (user.status !== 'Active') {
      // Find the super admin email
      const superAdmin = await this.usersRepository.findOne({
        where: { role: UserRole.SUPER_ADMIN },
      });
      const superAdminEmail = superAdmin ? superAdmin.email : null;
      // Return a custom error object
      return {
        error: true,
        message:
          'Your account is deactivated. Please contact the administrator.',
        superAdminEmail,
      };
    }

    const { password: _, ...result } = user;
    void _; // Explicitly mark as unused
    return result;
  }

  async login(user: LoginDto) {
    try {
      const validatedUser = await this.validateUser(user.email, user.password);

      // If validateUser returned a custom error object, return it directly
      if (validatedUser && validatedUser.error) {
        return validatedUser;
      }

      const payload: JwtPayload = {
        email: validatedUser.email,
        sub: validatedUser.id,
        role: validatedUser.role,
      };

      const access_token = this.jwtService.sign(payload);

      return {
        access_token,
        user: {
          id: validatedUser.id,
          email: validatedUser.email,
          role: validatedUser.role,
        },
      };
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw new UnauthorizedException(err.message);
      }
      throw new UnauthorizedException('An error occurred during login');
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // We don't want to reveal if the email exists or not
      return;
    }

    await this.passwordResetTokenService.generateToken(user);
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload;
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async forgotPassword(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        // Don't reveal if email exists or not for security
        return {
          success: true,
          message: 'If the email exists, a temporary password will be sent.',
        };
      }

      // Generate a temporary password
      const temporaryPassword = this.generateTemporaryPassword();

      // Hash the temporary password
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      // Update user with temporary password and set expiration (24 hours)
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 24);

      user.password = hashedPassword;
      user.isTemporaryPassword = true;
      user.passwordExpiresAt = expirationDate;

      // Save the user directly using the repository
      await this.usersRepository.save(user);

      // Send email with temporary password
      await this.emailService.sendTemporaryPasswordEmail(
        email,
        temporaryPassword,
      );

      return {
        success: true,
        message: 'Temporary password sent to your email.',
      };
    } catch (error) {
      console.error('Error in forgot password:', error);
      return {
        success: false,
        message: 'Failed to process password reset request.',
      };
    }
  }

  async changeTemporaryPassword(
    email: string,
    temporaryPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        return { success: false, message: 'User not found.' };
      }

      // Verify temporary password
      const isTemporaryPasswordValid = await bcrypt.compare(
        temporaryPassword,
        user.password,
      );

      if (!isTemporaryPasswordValid) {
        return { success: false, message: 'Invalid temporary password.' };
      }

      // Check if temporary password has expired
      if (user.passwordExpiresAt && user.passwordExpiresAt < new Date()) {
        return {
          success: false,
          message: 'Temporary password has expired. Please request a new one.',
        };
      }

      // Hash the new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update user with new password and clear temporary password flags
      user.password = hashedNewPassword;
      user.isTemporaryPassword = false;
      user.passwordExpiresAt = null;

      // Save the user directly using the repository
      await this.usersRepository.save(user);

      return { success: true, message: 'Password changed successfully.' };
    } catch (error) {
      console.error('Error changing temporary password:', error);
      return { success: false, message: 'Failed to change password.' };
    }
  }

  private generateTemporaryPassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
