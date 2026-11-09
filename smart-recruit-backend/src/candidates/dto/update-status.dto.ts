import { IsEnum, IsNotEmpty } from 'class-validator';
import { CandidateStatus } from '../entities/candidate.entity';

export class UpdateStatusDto {
  @IsNotEmpty()
  @IsEnum(CandidateStatus)
  status!: CandidateStatus;
}
