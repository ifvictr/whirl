interface Config {
    port: number
    redisUrl: string
    botToken?: string
    signingSecret?: string
}

const config: Config = {
    port: parseInt(process.env.PORT || '') || 3000,
    redisUrl: process.env.REDIS_URL || '',
    // Slack-specific config
    botToken: process.env.SLACK_CLIENT_BOT_TOKEN,
    signingSecret: process.env.SLACK_CLIENT_SIGNING_SECRET
}

export default config
