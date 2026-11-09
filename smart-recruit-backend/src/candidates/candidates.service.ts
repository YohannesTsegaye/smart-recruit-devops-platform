import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { Candidate, CandidateStatus } from './entities/candidate.entity';
import { EmailService } from '../email/email.service';

interface StatusCount {
  status: CandidateStatus;
  count: string;
}

interface DepartmentCount {
  department: string;
  count: string;
}

interface UpdateResponse {
  candidate: Candidate;
  emailStatus?: {
    success: boolean;
    message: string;
  };
}

interface DatabaseError extends Error {
  code?: string;
}

@Injectable()
export class CandidatesService {
  constructor(
    @InjectRepository(Candidate)
    private candidatesRepository: Repository<Candidate>,
    private emailService: EmailService,
  ) {}

  async create(createCandidateDto: CreateCandidateDto): Promise<Candidate> {
    try {
      // Check if user has already applied to this job
      const existingApplication = await this.candidatesRepository.findOne({
        where: {
          email: createCandidateDto.email,
          jobTitle: createCandidateDto.jobTitle,
        },
      });

      if (existingApplication) {
        throw new BadRequestException(
          `You have already applied to this job (${createCandidateDto.jobTitle}). Please check your email for application status.`,
        );
      }

      // Validate that either resumepath or link is provided
      if (!createCandidateDto.resumepath && !createCandidateDto.link) {
        throw new BadRequestException(
          'Either resume file or external link must be provided',
        );
      }

      // Create the candidate entity
      const candidate = this.candidatesRepository.create(createCandidateDto);

      // Try to save the candidate
      try {
        return await this.candidatesRepository.save(candidate);
      } catch (error) {
        const dbError = error as DatabaseError;
        console.error('Database error while saving candidate:', dbError);
        if (dbError.code === '23505') {
          // Unique constraint violation
          throw new BadRequestException(
            'A candidate with this email already exists',
          );
        }
        throw new BadRequestException(
          'Failed to save candidate. Please try again.',
        );
      }
    } catch (error) {
      // If it's already a BadRequestException, rethrow it
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Log the error for debugging
      console.error('Error creating candidate:', error);

      // Return a sanitized error message
      throw new BadRequestException(
        'Failed to create candidate. Please check your input and try again.',
      );
    }
  }

  async findAll(filters: {
    status?: CandidateStatus;
    department?: string;
    location?: string;
  }): Promise<Candidate[]> {
    const query = this.candidatesRepository.createQueryBuilder('candidate');

    if (filters.status) {
      query.andWhere('candidate.status = :status', { status: filters.status });
    }

    if (filters.department) {
      query.andWhere('candidate.department ILIKE :department', {
        department: `%${filters.department}%`,
      });
    }

    if (filters.location) {
      query.andWhere('candidate.location ILIKE :location', {
        location: `%${filters.location}%`,
      });
    }

    return await query.getMany();
  }

  async findOne(id: string): Promise<Candidate> {
    // Validate UUID format to provide better error message
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException(`Invalid candidate ID format: ${id}. Expected UUID format.`);
    }

    const candidate = await this.candidatesRepository.findOne({
      where: { id },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }
    return candidate;
  }

  async update(
    id: string,
    updateCandidateDto: UpdateCandidateDto,
  ): Promise<UpdateResponse> {
    const candidate = await this.findOne(id);
    const updatedCandidate = { ...candidate, ...updateCandidateDto };
    let emailStatus;

    // If status is being updated, send email notification
    if (
      updateCandidateDto.status &&
      updateCandidateDto.status !== candidate.status
    ) {
      emailStatus = await this.emailService.sendStatusUpdateEmail(
        candidate.email,
        candidate.fullname,
        updateCandidateDto.status,
        candidate.jobTitle,
      );
    }

    const savedCandidate =
      await this.candidatesRepository.save(updatedCandidate);
    return {
      candidate: savedCandidate,
      emailStatus,
    };
  }

  async remove(id: string): Promise<void> {
    const result = await this.candidatesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }
  }

  async findByJob(jobTitle: string): Promise<Candidate[]> {
    return await this.candidatesRepository.find({
      where: { jobTitle: ILike(`%${jobTitle}%`) },
    });
  }

  async checkExistingApplication(email: string, jobTitle: string): Promise<boolean> {
    const existingApplication = await this.candidatesRepository.findOne({
      where: {
        email: email,
        jobTitle: jobTitle,
      },
    });
    return !!existingApplication;
  }

  async updateStatus(
    id: string,
    status: CandidateStatus,
    emailDetails?: {
      content: string;
      recipientEmail: string;
      recipientName: string;
    },
  ): Promise<UpdateResponse> {
    const candidate = await this.findOne(id);
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    candidate.status = status;
    const updatedCandidate = await this.candidatesRepository.save(candidate);

    const emailStatus = await this.emailService.sendStatusUpdateEmail(
      emailDetails?.recipientEmail || candidate.email,
      emailDetails?.recipientName || candidate.fullname,
      status,
      candidate.jobTitle,
      emailDetails?.content,
    );

    return {
      candidate: updatedCandidate,
      emailStatus,
    };
  }

  async getStats() {
    const totalCandidates = await this.candidatesRepository.count();

    const statusCounts = await this.candidatesRepository
      .createQueryBuilder('candidate')
      .select('candidate.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('candidate.status')
      .getRawMany<StatusCount>();

    const departmentCounts = await this.candidatesRepository
      .createQueryBuilder('candidate')
      .select('candidate.department', 'department')
      .addSelect('COUNT(*)', 'count')
      .groupBy('candidate.department')
      .getRawMany<DepartmentCount>();

    return {
      totalCandidates,
      byStatus: statusCounts.reduce((acc: Record<string, number>, curr) => {
        acc[curr.status] = parseInt(curr.count);
        return acc;
      }, {}),
      byDepartment: departmentCounts.reduce(
        (acc: Record<string, number>, curr) => {
          acc[curr.department] = parseInt(curr.count);
          return acc;
        },
        {},
      ),
    };
  }
}
