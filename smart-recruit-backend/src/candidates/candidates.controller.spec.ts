import { Test, TestingModule } from '@nestjs/testing';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { EmailService } from '../email/email.service';

describe('CandidatesController', () => {
  let controller: CandidatesController;

  const mockCandidatesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    checkExistingApplication: jest.fn(),
  };

  const mockEmailService = {
    sendStatusUpdateEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidatesController],
      providers: [
        {
          provide: CandidatesService,
          useValue: mockCandidatesService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    controller = module.get<CandidatesController>(CandidatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
