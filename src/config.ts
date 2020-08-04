interface Config {
  databaseUrl: string
  port: number
  redisUrl: string
  botToken?: string
  signingSecret?: string
  chatMetadataThreshold: number
}

const config: Config = {
  databaseUrl: process.env.DATABASE_URL || process.env.MONGODB_URI || '',
  port: parseInt(process.env.PORT || '') || 3000,
  redisUrl: process.env.REDIS_URL || '',
  // Slack-specific config
  botToken: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  chatMetadataThreshold:
    parseInt(process.env.CHAT_METADATA_THRESHOLD || '') ?? 3
}

export default config
