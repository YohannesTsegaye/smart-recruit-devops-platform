import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  Patch,
  Param,
  Delete,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
  Res,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { Candidate } from './entities/candidate.entity';
import { CandidateStatus } from './entities/candidate.entity';
import { UpdateStatusDto } from './dto/update-status.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { EmailService } from '../email/email.service';

@Controller('candidates')
export class CandidatesController {
  private readonly uploadDir = './uploads';

  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly emailService: EmailService,
  ) {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadDir)) {
      try {
        fs.mkdirSync(this.uploadDir, { recursive: true });
        console.log('Created uploads directory:', this.uploadDir);
      } catch (error) {
        console.error('Failed to create uploads directory:', error);
      }
    }
  }

  @Get('download/:filename')
  async downloadResume(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    try {
      console.log(`Attempting to download file: ${filename}`);
      const filePath = path.join(this.uploadDir, filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        throw new NotFoundException('Resume file not found');
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        console.error(`Empty file: ${filePath}`);
        throw new BadRequestException('Resume file is empty');
      }

      // Get file extension and set appropriate content type
      const ext = path.extname(filename).toLowerCase();
      const contentType =
        ext === '.pdf'
          ? 'application/pdf'
          : ext === '.doc'
            ? 'application/msword'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      // Set response headers
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stats.size,
      });

      // Create read stream and return streamable file
      const file = createReadStream(filePath);
      console.log(`Successfully streaming file: ${filename}`);
      return new StreamableFile(file);
    } catch (error) {
      console.error('Error downloading resume:', {
        filename,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to download resume');
    }
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          try {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            const filename = `${uniqueSuffix}${ext}`;
            callback(null, filename);
          } catch (error) {
            callback(new Error('Failed to process file'), '');
          }
        },
      }),
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Only PDF and Word documents are allowed'),
            false,
          );
        }

        // Additional check for file extension
        const ext = extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.pdf', '.doc', '.docx'];
        if (!allowedExtensions.includes(ext)) {
          return callback(
            new BadRequestException(
              'Only .pdf, .doc, and .docx files are allowed',
            ),
            false,
          );
        }

        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  uploadResume(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Verify the file was actually saved
      const filePath = path.join(this.uploadDir, file.filename);
      if (!fs.existsSync(filePath)) {
        throw new InternalServerErrorException('File upload failed');
      }

      return { path: `/uploads/${file.filename}` };
    } catch (error) {
      console.error('Error handling uploaded file:', error);
      throw new InternalServerErrorException('Failed to process uploaded file');
    }
  }

  @Post()
  async create(@Body() createCandidateDto: CreateCandidateDto) {
    try {
      const candidate = await this.candidatesService.create(createCandidateDto);
      return {
        statusCode: HttpStatus.CREATED,
        data: candidate,
        message: 'Candidate created successfully',
      };
    } catch (error) {
      console.error('Error creating candidate:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create candidate');
    }
  }

  @Get()
  findAll(
    @Query('status') status?: CandidateStatus,
    @Query('department') department?: string,
    @Query('location') location?: string,
  ) {
    return this.candidatesService.findAll({ status, department, location });
  }

  // Specific routes must come BEFORE parameterized routes like :id
  @Get('check-application')
  async checkExistingApplication(
    @Query('email') email: string,
    @Query('jobTitle') jobTitle: string,
  ) {
    if (!email || !jobTitle) {
      throw new BadRequestException('Email and jobTitle are required');
    }

    const hasApplied = await this.candidatesService.checkExistingApplication(
      email,
      jobTitle,
    );

    return {
      hasApplied,
      message: hasApplied
        ? `You have already applied to ${jobTitle}`
        : `You can apply to ${jobTitle}`,
    };
  }

  @Get('stats/overview')
  getStats() {
    return this.candidatesService.getStats();
  }

  @Get('export/csv')
  async exportCandidatesCsv(@Res() res: Response) {
    const candidates = await this.candidatesService.findAll({});
    if (!candidates || candidates.length === 0) {
      return res.status(404).send('No candidates found');
    }
    // Prepare CSV header and rows
    const header = [
      'ID', 'Full Name', 'Email', 'Phone Number', 'Status', 'Department', 'Location', 'Job Title', 'Resume Path', 'Link', 'Applied Date'
    ];
    const rows = candidates.map(c => [
      c.id,
      c.fullname,
      c.email,
      c.phoneNumber,
      c.status,
      c.department,
      c.location,
      c.jobTitle,
      c.resumepath,
      c.link,
      c.appliedDate ? new Date(c.appliedDate).toISOString() : ''
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(field => '"' + (field ? String(field).replace(/"/g, '""') : '') + '"').join(','))
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="candidates.csv"');
    res.send(csv);
  }

  @Get('job/:jobTitle')
  findByJob(@Param('jobTitle') jobTitle: string) {
    return this.candidatesService.findByJob(jobTitle);
  }

  @Get(':id/email-preview/:status')
  async getEmailPreview(
    @Param('id') id: string,
    @Param('status') status: CandidateStatus,
  ) {
    const candidate = await this.candidatesService.findOne(id);
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    const emailPreview = await this.emailService.getEmailPreview(
      candidate.email,
      candidate.fullname,
      status,
      candidate.jobTitle,
    );

    return {
      statusCode: HttpStatus.OK,
      emailPreview,
    };
  }

  // Parameterized routes come LAST
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.candidatesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCandidateDto: UpdateCandidateDto,
  ) {
    const result = await this.candidatesService.update(id, updateCandidateDto);
    return {
      statusCode: HttpStatus.OK,
      data: result.candidate,
      emailStatus: result.emailStatus,
      message: result.emailStatus?.message || 'Candidate updated successfully',
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: CandidateStatus,
    @Body('emailDetails')
    emailDetails?: {
      content: string;
      recipientEmail: string;
      recipientName: string;
    },
  ) {
    const result = await this.candidatesService.updateStatus(
      id,
      status,
      emailDetails,
    );
    return {
      statusCode: HttpStatus.OK,
      data: result.candidate,
      emailStatus: result.emailStatus,
      message: result.emailStatus?.message || 'Status updated successfully',
    };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.candidatesService.remove(id);
  }
}
