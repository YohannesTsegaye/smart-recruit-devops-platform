import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPost } from './entities/jobpost.entity';
import { CreateJobPostDto } from './dto/create-jobpost.dto';
import { UpdateJobPostDto } from './dto/update-jobpost.dto';
import { RedisCacheService } from '../cache/redis-cache.service';

@Injectable()
export class JobPostService {
  constructor(
    @InjectRepository(JobPost)
    private jobPostRepository: Repository<JobPost>,
    private readonly redisCache: RedisCacheService,
  ) {}

  // Create a new job post
  async create(createJobPostDto: CreateJobPostDto): Promise<JobPost> {
    console.log(createJobPostDto, 'createJobPostDto');
    const jobPost = this.jobPostRepository.create(createJobPostDto);
    const savedJobPost = await this.jobPostRepository.save(jobPost);
    await this.invalidateListCache();
    return savedJobPost;
  }

  // Get all job posts with optional filters
  async findAll(filters?: {
    isActive?: boolean;
    company?: string;
    location?: string;
    jobType?: string;
  }): Promise<JobPost[]> {
    const normalizedFilters = filters ?? {};
    const cacheKey = `job-posts:list:${JSON.stringify(normalizedFilters)}`;
    return this.redisCache.getOrSet(cacheKey, 15, async () => {
      const query = this.jobPostRepository.createQueryBuilder('jobPost');

      if (normalizedFilters.isActive !== undefined) {
        query.andWhere('jobPost.isActive = :isActive', {
          isActive: normalizedFilters.isActive,
        });
      }
      if (normalizedFilters.company) {
        query.andWhere('jobPost.company ILIKE :company', {
          company: `%${normalizedFilters.company}%`,
        });
      }
      if (normalizedFilters.location) {
        query.andWhere('jobPost.location ILIKE :location', {
          location: `%${normalizedFilters.location}%`,
        });
      }
      if (normalizedFilters.jobType) {
        query.andWhere('jobPost.jobType = :jobType', {
          jobType: normalizedFilters.jobType,
        });
      }

      query.orderBy('jobPost.createdAt', 'DESC');
      return query.getMany();
    });
  }

  // Get a specific job post by ID
  async findOne(id: string): Promise<JobPost> {
    const jobPost = await this.jobPostRepository.findOne({ where: { id } });
    if (!jobPost) {
      throw new NotFoundException(`Job post with ID ${id} not found`);
    }
    return jobPost;
  }

  // Update a job post
  async update(
    id: string,
    updateJobPostDto: UpdateJobPostDto,
  ): Promise<JobPost> {
    const jobPost = await this.findOne(id);
    Object.assign(jobPost, updateJobPostDto);
    const savedJobPost = await this.jobPostRepository.save(jobPost);
    await this.invalidateListCache();
    return savedJobPost;
  }

  // Delete a job post
  async remove(id: string): Promise<void> {
    const result = await this.jobPostRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Job post with ID ${id} not found`);
    }
    await this.invalidateListCache();
  }

  // Toggle job post status (active/inactive)
  async toggleStatus(id: string): Promise<JobPost> {
    const jobPost = await this.findOne(id);
    jobPost.isActive = !jobPost.isActive;
    const savedJobPost = await this.jobPostRepository.save(jobPost);
    await this.invalidateListCache();
    return savedJobPost;
  }

  // Search jobs by keyword in title or description
  async searchJobs(keyword: string): Promise<JobPost[]> {
    return await this.jobPostRepository
      .createQueryBuilder('jobPost')
      .where(
        'jobPost.title ILIKE :keyword OR jobPost.description ILIKE :keyword',
        {
          keyword: `%${keyword}%`,
        },
      )
      .orderBy('jobPost.createdAt', 'DESC')
      .getMany();
  }

  // Get jobs that are expiring soon (within next 7 days)
  async getExpiringJobs(): Promise<JobPost[]> {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return await this.jobPostRepository
      .createQueryBuilder('jobPost')
      .where('jobPost.deadline <= :sevenDaysFromNow', { sevenDaysFromNow })
      .andWhere('jobPost.deadline > :now', { now: new Date() })
      .andWhere('jobPost.isActive = :isActive', { isActive: true })
      .orderBy('jobPost.deadline', 'ASC')
      .getMany();
  }

  // Get recently posted jobs (posted within last 30 days)
  async getRecentJobs(): Promise<JobPost[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await this.jobPostRepository
      .createQueryBuilder('jobPost')
      .where('jobPost.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
      .andWhere('jobPost.isActive = :isActive', { isActive: true })
      .orderBy('jobPost.createdAt', 'DESC')
      .getMany();
  }

  // Get jobs by salary range
  async getJobsBySalaryRange(
    minSalary: number,
    maxSalary: number,
  ): Promise<JobPost[]> {
    return await this.jobPostRepository
      .createQueryBuilder('jobPost')
      .where('jobPost.salary BETWEEN :minSalary AND :maxSalary', {
        minSalary,
        maxSalary,
      })
      .andWhere('jobPost.isActive = :isActive', { isActive: true })
      .orderBy('jobPost.createdAt', 'DESC')
      .getMany();
  }

  // Get job statistics
  async getStats() {
    const totalJobs = await this.jobPostRepository.count();
    const activeJobs = await this.jobPostRepository.count({ where: { isActive: true } });

    // Get counts by job type
    const jobTypeCounts = await this.jobPostRepository
      .createQueryBuilder('jobPost')
      .select('jobPost.jobType', 'jobType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('jobPost.jobType')
      .getRawMany();

    // Get counts by department
    const departmentCounts = await this.jobPostRepository
      .createQueryBuilder('jobPost')
      .select('jobPost.department', 'department')
      .addSelect('COUNT(*)', 'count')
      .groupBy('jobPost.department')
      .getRawMany();

    // Get counts by status
    const statusCounts = await this.jobPostRepository
      .createQueryBuilder('jobPost')
      .select('jobPost.isActive', 'isActive')
      .addSelect('COUNT(*)', 'count')
      .groupBy('jobPost.isActive')
      .getRawMany();

    return {
      totalJobs,
      activeJobs,
      byJobType: jobTypeCounts.reduce((acc, curr) => {
        if (curr.jobType) {
          acc[curr.jobType] = parseInt(curr.count);
        }
        return acc;
      }, {}),
      byDepartment: departmentCounts.reduce((acc, curr) => {
        if (curr.department) {
          acc[curr.department] = parseInt(curr.count);
        }
        return acc;
      }, {}),
      byStatus: statusCounts.reduce((acc, curr) => {
        acc[curr.isActive ? 'Active' : 'Inactive'] = parseInt(curr.count);
        return acc;
      }, {}),
    };
  }

  private async invalidateListCache(): Promise<void> {
    await this.redisCache.invalidateByPrefix('job-posts:list:');
  }
}
