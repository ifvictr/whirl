interface WhirlConfig {
    redisUrl: string
    port: number
    botToken?: string
    signingSecret?: string
}

const config: WhirlConfig = {
    redisUrl: process.env.REDIS_URL || '',
    port: parseInt(process.env.PORT || '') || 3000,
    // Slack-specific config
    botToken: process.env.SLACK_CLIENT_BOT_TOKEN,
    signingSecret: process.env.SLACK_CLIENT_SIGNING_SECRET
}

export default config
