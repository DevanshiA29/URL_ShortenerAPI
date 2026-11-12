import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LinkDocument = HydratedDocument<Link>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Link {
  @Prop({ required: true, unique: true, index: true })
  code: string;

  @Prop({ required: true })
  long_url: string;

  @Prop({ required: true, index: true })
  created_by: string;

  @Prop()
  expires_at?: Date;

  @Prop({ type: [String], default: [] })
  tags: string[];
  created_at: Date;
}

export const LinkSchema = SchemaFactory.createForClass(Link);
