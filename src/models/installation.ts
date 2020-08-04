import { Installation } from '@slack/oauth'
import mongoose, { Document, Schema } from 'mongoose'

export type IInstallation = Installation & Document

const InstallationSchema = new Schema({
  appId: String,
  bot: {
    id: String,
    scopes: [String],
    token: String,
    userId: String
  },
  enterprise: {
    id: String,
    name: String
  },
  incomingWebhook: {
    channel: String,
    channelId: String,
    configurationUrl: String,
    url: String
  },
  team: {
    id: String,
    name: String
  },
  tokenType: String,
  user: {
    id: String,
    token: String,
    scopes: [String]
  }
})

export default mongoose.model<IInstallation>('Installation', InstallationSchema)
