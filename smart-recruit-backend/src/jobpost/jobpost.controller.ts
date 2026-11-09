import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { JobPostService } from './jobpost.service';
import { CreateJobPostDto } from './dto/create-jobpost.dto';
import { UpdateJobPostDto } from './dto/update-jobpost.dto';
import { JobPost } from './entities/jobpost.entity';
import { Response } from 'express';

@Controller('job-posts')
export class JobPostController {
  constructor(private readonly jobPostService: JobPostService) {}

  @Post()
  create(@Body() createJobPostDto: CreateJobPostDto): Promise<JobPost> {
    return this.jobPostService.create(createJobPostDto);
  }

  @Get()
  findAll(
    @Query('isActive') isActive?: boolean,
    @Query('company') company?: string,
    @Query('location') location?: string,
    @Query('jobType') jobType?: string,
  ): Promise<JobPost[]> {
    const filters = { isActive, company, location, jobType };
    return this.jobPostService.findAll(filters);
  }

  @Get('search')
  search(@Query('keyword') keyword: string): Promise<JobPost[]> {
    return this.jobPostService.searchJobs(keyword);
  }

  @Get('expiring')
  getExpiringJobs(): Promise<JobPost[]> {
    return this.jobPostService.getExpiringJobs();
  }

  @Get('recent')
  getRecentJobs(): Promise<JobPost[]> {
    return this.jobPostService.getRecentJobs();
  }

  @Get('stats')
  getStats() {
    return this.jobPostService.getStats();
  }

  @Get('salary-range')
  getJobsBySalaryRange(
    @Query('min') minSalary: number,
    @Query('max') maxSalary: number,
  ): Promise<JobPost[]> {
    return this.jobPostService.getJobsBySalaryRange(minSalary, maxSalary);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<JobPost> {
    return this.jobPostService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateJobPostDto: UpdateJobPostDto,
  ): Promise<JobPost> {
    return this.jobPostService.update(id, updateJobPostDto);
  }

  @Put(':id/toggle-status')
  toggleStatus(@Param('id') id: string): Promise<JobPost> {
    return this.jobPostService.toggleStatus(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.jobPostService.remove(id);
  }

  @Get('export/csv')
  async exportJobsCsv(@Res() res: Response) {
    const jobs = await this.jobPostService.findAll({});
    if (!jobs || jobs.length === 0) {
      return res.status(404).send('No jobs found');
    }
    // Prepare CSV header and rows
    const header = [
      'ID', 'Title', 'Company', 'Location', 'Job Type', 'Salary', 'Description', 'Is Active', 'Deadline', 'Created At'
    ];
    const rows = jobs.map(j => [
      j.id,
      j.title,
      j.company,
      j.location,
      j.jobType,
      j.salary,
      j.description,
      j.isActive,
      j.deadline ? new Date(j.deadline).toISOString() : '',
      j.createdAt ? new Date(j.createdAt).toISOString() : ''
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(field => '"' + (field ? String(field).replace(/"/g, '""') : '') + '"').join(','))
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="jobs.csv"');
    res.send(csv);
  }
}
export default JobPostController;
