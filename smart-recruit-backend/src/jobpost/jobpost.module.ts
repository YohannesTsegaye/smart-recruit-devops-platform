import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPostController } from './jobpost.controller';
import { JobPostService } from './jobpost.service';
import { JobPost } from './entities/jobpost.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JobPost])],
  controllers: [JobPostController],
  providers: [JobPostService],
  exports: [JobPostService],
})
export class JobpostModule {}
