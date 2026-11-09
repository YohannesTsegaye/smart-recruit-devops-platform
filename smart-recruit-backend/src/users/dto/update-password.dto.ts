import { IsNotEmpty, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsNotEmpty()
  currentPassword!: string;
 
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;
} 