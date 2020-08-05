import mongoose, { Document, Schema } from 'mongoose'

interface ChatMember {
  id: string
  noun: string
}

export interface IChatMetadata extends Document {
  teamId: string
  startedAt: Date
  size: number
  members?: ChatMember[]
  endedAt?: Date
  messageCount?: number
}

const ChatMetadataSchema = new Schema({
  _id: {
    type: String,
    required: true,
    immutable: true
  },
  teamId: {
    type: String,
    required: true,
    immutable: true
  },
  startedAt: {
    type: Date,
    required: true,
    immutable: true
  },
  size: {
    type: Number,
    required: true,
    immutable: true
  },
  members: [
    {
      id: String,
      noun: String
    }
  ],
  endedAt: Date,
  messageCount: {
    type: Number,
    required: true,
    default: 0
  }
})

export const ChatMetadata = mongoose.model<IChatMetadata>(
  'ChatMetadata',
  ChatMetadataSchema
)
