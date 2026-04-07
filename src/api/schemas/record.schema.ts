import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RecordFormat, RecordCategory } from '../enum/record.enum';

@Schema({ timestamps: true })
export class Record extends Document {
  @Prop({ required: true })
  artist: string;

  @Prop({ required: true })
  album: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  qty: number;

  @Prop({ enum: RecordFormat, required: true })
  format: RecordFormat;

  @Prop({ enum: RecordCategory, required: true })
  category: RecordCategory;

  @Prop({ default: Date.now })
  created: Date;

  @Prop({ default: Date.now })
  lastModified: Date;

  @Prop({ required: false })
  mbid?: string;

  @Prop({ type: [String], default: [] })
  tracklist: string[];
}

export const RecordSchema = SchemaFactory.createForClass(Record);

RecordSchema.index(
  { artist: 1, album: 1, format: 1 },
  { unique: true, name: 'artist_album_format_unique' },
);

RecordSchema.index(
  { artist: 'text', album: 'text', category: 'text' },
  { name: 'record_text_search' },
);

RecordSchema.index({ format: 1, category: 1 });
