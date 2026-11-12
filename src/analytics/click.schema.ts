import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type ClickDocument = HydratedDocument<Click>;

@Schema({
  collection: 'clicks',
  timestamps: { createdAt: 'created_at', updatedAt: false },
})
export class Click {
  @Prop({ type: SchemaTypes.ObjectId, required: true, ref: 'Link', index: true })
  link_id: Types.ObjectId;

  @Prop({ required: true, index: true })
  code: string;

  @Prop({ required: true, unique: true, index: true })
  request_id: string; // Idempotency key

  @Prop({ required: true })
  ip_hash: string; // SHA-256 privacy hash, never raw IP

  @Prop({ required: false, default: '' })
  user_agent: string;

  @Prop({ required: false, default: '' })
  referrer: string;

  @Prop({ required: true, default: Date.now, index: true })
  timestamp: Date;
}

export const ClickSchema = SchemaFactory.createForClass(Click);

// Compound index for time-window queries
ClickSchema.index({ link_id: 1, timestamp: 1 });

