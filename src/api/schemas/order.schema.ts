import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Record', required: true })
  recordId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ recordId: 1, createdAt: -1 });
