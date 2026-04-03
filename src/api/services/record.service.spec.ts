import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RecordService } from './record.service';
import { MusicBrainzService } from './musicbrainz.service';
import { RecordCategory, RecordFormat } from '../schemas/record.enum';
describe('RecordService', () => {
  let service: RecordService;
  let recordModel: {
    create: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
  };
  let musicBrainz: { getTracklistForRelease: jest.Mock };
  let cache: { get: jest.Mock; set: jest.Mock; clear: jest.Mock };

  beforeEach(async () => {
    recordModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };
    musicBrainz = { getTracklistForRelease: jest.fn() };
    let cached: unknown;
    cache = {
      get: jest.fn().mockImplementation(async () => cached),
      set: jest.fn().mockImplementation(async (_k, v) => {
        cached = v;
      }),
      clear: jest.fn().mockImplementation(async () => {
        cached = undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordService,
        { provide: getModelToken('Record'), useValue: recordModel },
        { provide: MusicBrainzService, useValue: musicBrainz },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = module.get(RecordService);
  });

  it('creates record with tracklist when mbid is provided', async () => {
    musicBrainz.getTracklistForRelease.mockResolvedValue(['A', 'B']);
    recordModel.create.mockResolvedValue({ _id: '1' });

    await service.create({
      artist: 'X',
      album: 'Y',
      price: 10,
      qty: 1,
      format: RecordFormat.VINYL,
      category: RecordCategory.ROCK,
      mbid: 'some-mbid',
    });

    expect(musicBrainz.getTracklistForRelease).toHaveBeenCalledWith('some-mbid');
    expect(recordModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ tracklist: ['A', 'B'] }),
    );
    expect(cache.clear).toHaveBeenCalled();
  });

  it('findManyPaginated uses cache on second call', async () => {
    recordModel.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => ({ exec: jest.fn().mockResolvedValue([]) }),
          }),
        }),
      }),
    });
    recordModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    const q = {};
    const first = await service.findManyPaginated(q);
    const second = await service.findManyPaginated(q);

    expect(first.total).toBe(0);
    expect(second).toEqual(first);
    expect(recordModel.find).toHaveBeenCalledTimes(1);
  });
});
