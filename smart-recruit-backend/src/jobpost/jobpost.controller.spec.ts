import { Test, TestingModule } from '@nestjs/testing';
import { JobPostController } from './jobpost.controller';
import { JobPostService } from './jobpost.service';

describe('JobPostController', () => {
  let controller: JobPostController;

  const mockJobPostService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobPostController],
      providers: [
        {
          provide: JobPostService,
          useValue: mockJobPostService,
        },
      ],
    }).compile();

    controller = module.get<JobPostController>(JobPostController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
