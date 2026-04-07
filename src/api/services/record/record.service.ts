import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Record as RecordDocument } from '../../schemas/record.schema';
import { CreateRecordRequestDTO } from '../../dtos/create-record.request.dto';
import { UpdateRecordRequestDTO } from '../../dtos/update-record.request.dto';
import { RecordQueryDto } from '../../dtos/record-query.dto';
import { MusicBrainzService } from '../musicbrainz/musicbrainz.service';
import { RecordCategory, RecordFormat } from '../../enum/record.enum';

export interface PaginatedRecords {
  items: RecordDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const CACHE_KEY_PREFIX = 'records:list:';

@Injectable()
export class RecordService {
  constructor(
    @InjectModel('Record') private readonly recordModel: Model<RecordDocument>,
    private readonly musicBrainz: MusicBrainzService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private cacheKeyForQuery(query: RecordQueryDto): string {
    const stable = {
      q: query.q,
      artist: query.artist,
      album: query.album,
      format: query.format,
      category: query.category,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };
    return `${CACHE_KEY_PREFIX}${JSON.stringify(stable)}`;
  }

  async invalidateListCache(): Promise<void> {
    await this.cache.clear();
  }

  async create(dto: CreateRecordRequestDTO): Promise<RecordDocument> {
    let tracklist: string[] = [];
    if (dto?.mbid?.trim()) {
      tracklist = await this.musicBrainz.getTracklistForRelease(dto?.mbid);
    }

    try {
      const created = await this.recordModel.create({
        artist: dto?.artist,
        album: dto?.album,
        price: dto?.price,
        qty: dto?.qty,
        format: dto?.format,
        category: dto?.category,
        mbid: dto?.mbid,
        tracklist,
      });
      await this.invalidateListCache();
      return created;
    } catch (err: unknown) {
      throw err;
    }
  }

  async update(
    id: string,
    dto: UpdateRecordRequestDTO,
  ): Promise<RecordDocument | null> {
    const existing = await this.recordModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Record not found');
    }

    const previousMbid = existing.mbid?.trim() ?? '';

    const $set: Record<string, unknown> = { lastModified: new Date() };
    const $unset: Record<string, unknown> = {};

    if (dto.artist !== undefined) $set.artist = dto.artist;
    if (dto.album !== undefined) $set.album = dto.album;
    if (dto.price !== undefined) $set.price = dto.price;
    if (dto.qty !== undefined) $set.qty = dto.qty;
    if (dto.format !== undefined) $set.format = dto.format;
    if (dto.category !== undefined) $set.category = dto.category;

    if (dto.mbid !== undefined) {
      const next = dto.mbid.trim();
      if (!next) {
        $unset.mbid = '';
        $set.tracklist = [];
      } else {
        $set.mbid = next;
        if (next !== previousMbid) {
          $set.tracklist = await this.musicBrainz.getTracklistForRelease(next);
        }
      }
    }

    const updateOp: {
      $set?: Record<string, unknown>;
      $unset?: Record<string, unknown>;
    } = { $set };
    if (Object.keys($unset).length) {
      updateOp.$unset = $unset;
    }

    try {
      const updated = await this.recordModel
        .findByIdAndUpdate(id, updateOp, { new: true, runValidators: true })
        .exec();
      await this.invalidateListCache();
      return updated;
    } catch (err: unknown) {
      throw err;
    }
  }

  async findManyPaginated(query: RecordQueryDto): Promise<PaginatedRecords> {
    const cacheKey = this.cacheKeyForQuery(query);
    const cached = await this.cache.get<PaginatedRecords>(cacheKey);
    if (cached){ 
      return cached;
    }

    const page = query?.page ?? 1;
    const limit = Math.min(query?.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const filter = this.buildFilter(query);

    const [items, total] = await Promise.all([
      this.recordModel
        .find(filter)
        .sort({ artist: 1, album: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec() as Promise<RecordDocument[]>,
      this.recordModel.countDocuments(filter).exec(),
    ]);

    const result: PaginatedRecords = {
      items: items as RecordDocument[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };

    await this.cache.set(cacheKey, result, 60_000);
    return result;
  }

  private buildFilter(query: RecordQueryDto): FilterQuery<RecordDocument> {
    const filter: FilterQuery<RecordDocument> = {};

    if (query?.q?.trim()) {
      filter.$text = { $search: query?.q.trim() };
    }

    if (query?.artist?.trim()) {
      filter.artist = this.caseInsensitiveContains(query?.artist);
    }
    if (query?.album?.trim()) {
      filter.album = this.caseInsensitiveContains(query?.album);
    }
    if (query?.format) {
      filter.format = query?.format as RecordFormat;
    }
    if (query?.category) {
      filter.category = query?.category as RecordCategory;
    }

    return filter;
  }

  private caseInsensitiveContains(value: string): RegExp {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, 'i');
  }
}
