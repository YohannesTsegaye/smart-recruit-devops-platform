import { Injectable, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ResetTokenService } from './reset-token.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private resetTokenService: ResetTokenService,
    private emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const normalizedEmail = createUserDto.email.toLowerCase();
    const user = this.usersRepository.create({
      ...createUserDto,
      email: normalizedEmail,
      password: hashedPassword,
    });
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    // Case-insensitive lookup to avoid issues with different email casing
    return this.usersRepository.findOne({ where: { email: ILike(email) } });
  }

  async findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async updateRole(id: number, role: UserRole): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    user.role = role;
    return this.usersRepository.save(user);
  }

  async updateEmail(userId: number, updateEmailDto: UpdateEmailDto): Promise<User> {
    const user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if the new email is already taken by another user
    const normalizedEmail = updateEmailDto.email.toLowerCase();
    const existingUser = await this.findByEmail(normalizedEmail);
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Email is already in use');
    }

    // Store the previous email before updating
    const previousEmail = user.email;
    
    // Update the email and store the previous email
    user.previousEmail = previousEmail;
    user.email = normalizedEmail;
    
    return this.usersRepository.save(user);
  }

  async updatePassword(userId: number, updatePasswordDto: UpdatePasswordDto): Promise<void> {
    let user: User | null;
    
    // If userId is undefined, try to find user by email from the JWT payload
    if (!userId) {
      console.log('=== PASSWORD UPDATE DEBUG: User ID is undefined ===');
      // This is a fallback - in normal cases, userId should be provided
      // We'll need to get the email from somewhere, but for now, we'll throw an error
      throw new UnauthorizedException('User ID is missing from authentication token');
    }
    
    user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    console.log('=== PASSWORD UPDATE DEBUG ===');
    console.log('User ID:', userId);
    console.log('User Email:', user.email);
    console.log('Current password from request:', updatePasswordDto.currentPassword);
    console.log('Stored password hash:', user.password);

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.password
    );
    
    console.log('Password comparison result:', isCurrentPasswordValid);
    
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(updatePasswordDto.newPassword, 10);
    
    // Update the password and clear temporary password flags
    user.password = hashedNewPassword;
    user.isTemporaryPassword = false;
    user.passwordExpiresAt = null;
    await this.usersRepository.save(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.findByEmail(loginDto.email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Only allow admin or super_admin
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Invalid credentials or not an admin');
    }

    // Check if user is active
    if (user.status !== 'Active') {
      // Find the super admin email
      const superAdmin = await this.usersRepository.findOne({ where: { role: UserRole.SUPER_ADMIN } });
      const superAdminEmail = superAdmin ? superAdmin.email : null;
      // Instead of throwing, return a custom error object
      return {
        error: true,
        message: 'Your account is deactivated. Please contact the administrator.',
        superAdminEmail,
      };
    }

    // Check if temporary password has expired
    if (user.isTemporaryPassword && user.passwordExpiresAt && user.passwordExpiresAt < new Date()) {
      throw new UnauthorizedException('Temporary password has expired. Please contact administrator for a new password.');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        isTemporaryPassword: user.isTemporaryPassword,
      },
    };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.resetTokenService.generateResetToken(user);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.resetTokenService.validateResetToken(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await this.resetTokenService.clearResetToken(user);
    await this.usersRepository.save(user);
  }

  async getAllAdmins(): Promise<User[]> {
    return this.usersRepository.find({
      where: [
        { role: UserRole.ADMIN },
        { role: UserRole.SUPER_ADMIN }
      ],
      select: ['id', 'email', 'previousEmail', 'role', 'status', 'createdAt', 'updatedAt'],
      order: { createdAt: 'DESC' }
    });
  }

  async addAdmin(email: string, role: UserRole, temporaryPassword: string): Promise<User> {
    // Check if email already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Create new admin user
    const admin = this.usersRepository.create({
      email,
      role,
      password: hashedPassword,
      status: 'Active',
      isTemporaryPassword: true,
      passwordExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    });

    const savedAdmin = await this.usersRepository.save(admin);

    // After saving the admin, send the welcome email
    await this.emailService.sendAdminWelcomeEmail(email, temporaryPassword, role);

    return savedAdmin;
  }

  async toggleAdminStatus(adminId: number, status: string): Promise<User> {
    const admin = await this.findOne(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.role !== UserRole.ADMIN && admin.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('User is not an admin');
    }

    admin.status = status;
    return this.usersRepository.save(admin);
  }

  async removeAdmin(adminId: number): Promise<void> {
    const admin = await this.findOne(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.role !== UserRole.ADMIN && admin.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('User is not an admin');
    }

    await this.usersRepository.remove(admin);
  }
} 