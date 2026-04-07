import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { RecordController } from './controllers/record/record.controller';
import { RecordService } from './services/record/record.service';
import { MusicBrainzService } from './services/musicbrainz/musicbrainz.service';
import { RecordSchema } from './schemas/record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Record', schema: RecordSchema }]),
    CacheModule.register({ ttl: 60_000 }),
  ],
  controllers: [RecordController],
  providers: [RecordService, MusicBrainzService],
})
export class RecordModule {}
