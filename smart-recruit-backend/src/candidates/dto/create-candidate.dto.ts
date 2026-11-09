import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { CandidateStatus } from '../entities/candidate.entity';

export class CreateCandidateDto {
  @IsNotEmpty()
  @IsString()
  fullname!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.5)
  @Max(4.0)
  gpa!: number;

  @IsOptional()
  @IsString()
  resumepath?: string;

  @IsNotEmpty()
  @IsString()
  experience!: string;

  @IsNotEmpty()
  @IsString()
  skills!: string;

  @IsNotEmpty()
  @IsString()
  coverletter!: string;

  @IsNotEmpty()
  @IsString()
  jobTitle!: string;

  @IsNotEmpty()
  @IsString()
  location!: string;

  @IsNotEmpty()
  @IsString()
  department!: string;

  @IsNotEmpty()
  @IsEnum(CandidateStatus)
  status!: CandidateStatus;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\+251\d{9}$/, {
    message: 'Phone number must start with +251 followed by 9 digits',
  })
  phoneNumber!: string;
}
