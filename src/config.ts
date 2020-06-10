interface WhirlConfig {
    databaseUrl?: string
    port: number | string
    botToken?: string
    signingSecret?: string
}

const config: WhirlConfig = {
    databaseUrl: process.env.DATABASE_URL || process.env.MONGODB_URI,
    port: process.env.PORT || 3000,
    // Slack-specific config
    botToken: process.env.SLACK_CLIENT_BOT_TOKEN,
    signingSecret: process.env.SLACK_CLIENT_SIGNING_SECRET
}

export default config
