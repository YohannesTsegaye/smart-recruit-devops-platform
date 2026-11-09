import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    console.log('=== JWT GUARD DEBUG ===');
    console.log('Request URL:', request.url);
    console.log('Authorization header:', request.headers.authorization);
    console.log('Extracted token:', token ? token.substring(0, 20) + '...' : 'No token');

    if (!token) {
      console.log('No token provided - throwing UnauthorizedException');
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      console.log('Token verified successfully. User payload:', payload);
      
      // Ensure the user object has the correct structure
      request.user = {
        id: payload.sub, // Use 'sub' as the user ID
        email: payload.email,
        role: payload.role,
      };
      
      console.log('Set user object in request:', request.user);
      return true;
    } catch (error: any) {
      console.log('Token verification failed:', error.message);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
} 