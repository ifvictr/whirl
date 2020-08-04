interface Config {
  databaseUrl: string
  port: number
  redisUrl: string
  signingSecret?: string
  stateSecret?: string
  clientId?: string
  clientSecret?: string
  chatMetadataThreshold: number
}

const config: Config = {
  databaseUrl: process.env.DATABASE_URL || process.env.MONGODB_URI || '',
  port: parseInt(process.env.PORT || '') || 3000,
  redisUrl: process.env.REDIS_URL || '',
  // Slack-specific config
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  chatMetadataThreshold:
    parseInt(process.env.CHAT_METADATA_THRESHOLD || '') ?? 3
}

export default config
