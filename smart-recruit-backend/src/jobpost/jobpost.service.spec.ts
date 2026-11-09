import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JobPost } from './entities/jobpost.entity';
import { RedisCacheService } from '../cache/redis-cache.service';
import { JobPostService } from './jobpost.service';

describe('JobpostService', () => {
  let service: JobPostService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobPostService,
        { provide: getRepositoryToken(JobPost), useValue: {} },
        { provide: RedisCacheService, useValue: {} },
      ],
    }).compile();

    service = module.get<JobPostService>(JobPostService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
