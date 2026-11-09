import { Controller, Post, Body, Get, UseGuards, Request, Patch, Param, ParseIntPipe, UnauthorizedException, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';
import * as bcrypt from 'bcrypt';

interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    role: UserRole;
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post('register')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.usersService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req: RequestWithUser) {
    return req.user;
  }

  @Patch('update-email')
  @UseGuards(JwtAuthGuard)
  updateEmail(@Request() req: RequestWithUser, @Body() updateEmailDto: UpdateEmailDto) {
    return this.usersService.updateEmail(req.user.id, updateEmailDto);
  }

  @Patch('update-password')
  @UseGuards(JwtAuthGuard)
  updatePassword(@Request() req: RequestWithUser, @Body() updatePasswordDto: UpdatePasswordDto) {
    console.log('=== CONTROLLER UPDATE PASSWORD DEBUG ===');
    console.log('Controller: Received request to update password');
    console.log('Controller: Full request user object:', req.user);
    console.log('Controller: JWT User ID:', req.user?.id);
    console.log('Controller: JWT User Email:', req.user?.email);
    console.log('Controller: JWT User Role:', req.user?.role);
    console.log('Controller: Request body:', updatePasswordDto);
    console.log('Controller: Current password length:', updatePasswordDto.currentPassword?.length);
    console.log('Controller: New password length:', updatePasswordDto.newPassword?.length);
    
    // Check if user ID is undefined
    if (!req.user?.id) {
      console.log('ERROR: User ID is undefined in request!');
      throw new UnauthorizedException('User ID is missing from authentication token');
    }
    
    return this.usersService.updatePassword(req.user.id, updatePasswordDto);
  }

  @Post('test-password')
  @UseGuards(JwtAuthGuard)
  async testPassword(@Request() req: RequestWithUser, @Body() body: { currentPassword: string }) {
    const user = await this.usersService.findOne(req.user.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    console.log('=== PASSWORD TEST DEBUG ===');
    console.log('User ID:', req.user.id);
    console.log('User Email:', req.user.email);
    console.log('Current password from request:', body.currentPassword);
    console.log('Stored password hash:', user.password);
    
    const isValid = await bcrypt.compare(body.currentPassword, user.password);
    console.log('Password comparison result:', isValid);
    
    return {
      userId: req.user.id,
      userEmail: req.user.email,
      passwordValid: isValid,
      message: isValid ? 'Password is correct' : 'Password is incorrect',
      debug: {
        userId: req.user.id,
        userEmail: req.user.email,
        passwordHash: user.password.substring(0, 20) + '...', // Show first 20 chars for security
        passwordLength: user.password.length,
        inputPasswordLength: body.currentPassword.length,
        inputPassword: body.currentPassword,
        hashStartsWith: user.password.startsWith('$2b$'),
        hashFormat: user.password.substring(0, 7) // Should be "$2b$10$"
      }
    };
  }

  @Post('debug-password-hash')
  @UseGuards(JwtAuthGuard)
  async debugPasswordHash(@Request() req: RequestWithUser, @Body() body: { testPassword: string }) {
    const user = await this.usersService.findOne(req.user.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    console.log('=== PASSWORD HASH DEBUG ===');
    console.log('Testing password:', body.testPassword);
    console.log('Stored hash:', user.password);
    
    // Test the provided password against the stored hash
    const isValid = await bcrypt.compare(body.testPassword, user.password);
    
    // Generate a new hash with the same password to see if it matches
    const newHash = await bcrypt.hash(body.testPassword, 10);
    
    // Test if the new hash would work
    const newHashValid = await bcrypt.compare(body.testPassword, newHash);
    
    return {
      userId: req.user.id,
      userEmail: req.user.email,
      testPassword: body.testPassword,
      storedHash: user.password,
      isValid: isValid,
      newHash: newHash,
      newHashValid: newHashValid,
      hashComparison: {
        storedHashLength: user.password.length,
        newHashLength: newHash.length,
        storedHashStartsWith: user.password.startsWith('$2b$'),
        newHashStartsWith: newHash.startsWith('$2b$'),
        hashesMatch: user.password === newHash
      }
    };
  }

  @Get('debug-user')
  @UseGuards(JwtAuthGuard)
  async debugUser(@Request() req: RequestWithUser) {
    const user = await this.usersService.findOne(req.user.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      passwordHash: user.password.substring(0, 20) + '...',
      createdAt: user.createdAt
    };
  }

  @Post('reset-password-for-testing')
  @UseGuards(JwtAuthGuard)
  async resetPasswordForTesting(@Request() req: RequestWithUser, @Body() body: { newPassword: string }) {
    const user = await this.usersService.findOne(req.user.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    console.log('=== RESET PASSWORD FOR TESTING ===');
    console.log('User ID:', req.user.id);
    console.log('User Email:', req.user.email);
    console.log('New password:', body.newPassword);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(body.newPassword, 10);
    
    // Update the password
    user.password = hashedPassword;
    await this.usersService['usersRepository'].save(user);
    
    console.log('Password reset successfully');
    console.log('New hash:', hashedPassword);
    
    return {
      message: 'Password reset successfully for testing',
      userId: req.user.id,
      userEmail: req.user.email,
      newPassword: body.newPassword,
      newHash: hashedPassword
    };
  }

  @Get('admins')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAllAdmins() {
    return this.usersService.getAllAdmins();
  }

  @Patch('toggle-admin-status/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async toggleAdminStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string
  ) {
    return this.usersService.toggleAdminStatus(id, status);
  }

  @Delete('remove-admin/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async removeAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.removeAdmin(id);
  }

  @Post('add-admin')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addAdmin(@Body() body: { email: string; role: string }) {
    const randomPart = Math.random().toString(36).slice(-8).toUpperCase();
    const temporaryPassword = 'SR' + randomPart;
    return this.usersService.addAdmin(body.email, body.role as UserRole, temporaryPassword);
  }

  @Get('test-auth')
  @UseGuards(JwtAuthGuard)
  async testAuth(@Request() req: RequestWithUser) {
    console.log('=== TEST AUTH DEBUG ===');
    console.log('User from JWT:', req.user);
    return {
      message: 'Authentication successful',
      user: req.user
    };
  }

  @Post('debug-current-password')
  @UseGuards(JwtAuthGuard)
  async debugCurrentPassword(@Request() req: RequestWithUser, @Body() body: { currentPassword: string }) {
    const user = await this.usersService.findOne(req.user.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    console.log('=== DEBUG CURRENT PASSWORD ===');
    console.log('User ID:', req.user.id);
    console.log('User Email:', req.user.email);
    console.log('Input password:', body.currentPassword);
    console.log('Input password length:', body.currentPassword.length);
    console.log('Input password character codes:', [...body.currentPassword].map(c => c.charCodeAt(0)));
    console.log('Stored password hash:', user.password);
    console.log('Stored hash length:', user.password.length);
    
    const isValid = await bcrypt.compare(body.currentPassword, user.password);
    console.log('Password comparison result:', isValid);
    
    // Also test with trimmed password
    const trimmedPassword = body.currentPassword.trim();
    const isTrimmedValid = await bcrypt.compare(trimmedPassword, user.password);
    console.log('Trimmed password comparison result:', isTrimmedValid);
    
    return {
      userId: req.user.id,
      userEmail: req.user.email,
      inputPassword: body.currentPassword,
      inputPasswordLength: body.currentPassword.length,
      inputPasswordTrimmed: trimmedPassword,
      storedHash: user.password,
      isValid: isValid,
      isTrimmedValid: isTrimmedValid,
      userStatus: user.status,
      isTemporaryPassword: user.isTemporaryPassword
    };
  }

  @Patch('update-role')
  @UseGuards(JwtAuthGuard)
  updateRole(@Request() req: RequestWithUser, @Body() updateRoleDto: UpdateRoleDto) {
    return this.usersService.updateRole(req.user.id, updateRoleDto.role);
  }
} 