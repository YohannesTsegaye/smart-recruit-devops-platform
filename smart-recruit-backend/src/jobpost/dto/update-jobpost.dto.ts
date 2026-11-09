import { PartialType } from '@nestjs/mapped-types';
import { CreateJobPostDto } from './create-jobpost.dto';

export class UpdateJobPostDto extends PartialType(CreateJobPostDto) {}
