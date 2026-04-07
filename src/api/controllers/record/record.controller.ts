import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateRecordRequestDTO } from '../../dtos/create-record.request.dto';
import { RecordCategory, RecordFormat } from '../../schemas/record.enum';
import { UpdateRecordRequestDTO } from '../../dtos/update-record.request.dto';
import { Record as RecordDocument } from '../../schemas/record.schema';
import { RecordService, PaginatedRecords } from '../../services/record/record.service';
import { RecordQueryDto } from '../../dtos/record-query.dto';

@ApiTags('records')
@Controller('records')
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new record' })
  @ApiResponse({ status: 201, description: 'Record successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({
    status: 409,
    description: 'Duplicate artist + album + format',
  })
  async create(
    @Body() request: CreateRecordRequestDTO,
  ): Promise<RecordDocument> {
    return this.recordService.create(request);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing record' })
  @ApiResponse({ status: 200, description: 'Record updated successfully' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  @ApiResponse({
    status: 409,
    description: 'Duplicate artist + album + format',
  })
  async update(
    @Param('id') id: string,
    @Body() updateRecordDto: UpdateRecordRequestDTO,
  ): Promise<RecordDocument | null> {
    return this.recordService.update(id, updateRecordDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Search records with filters, pagination, and optional full-text query',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of records',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description:
      'Full-text search (artist, album, category). Uses MongoDB text index.',
    type: String,
  })
  @ApiQuery({
    name: 'artist',
    required: false,
    description: 'Substring match on artist',
    type: String,
  })
  @ApiQuery({
    name: 'album',
    required: false,
    description: 'Substring match on album',
    type: String,
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Filter by record format',
    enum: RecordFormat,
    type: String,
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
    enum: RecordCategory,
    type: String,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async findAll(@Query() query: RecordQueryDto): Promise<PaginatedRecords> {
    return this.recordService.findManyPaginated(query);
  }
}
