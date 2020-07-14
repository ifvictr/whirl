import { View } from '@slack/types'

export interface HomeLayoutProps {
    activeChatCount?: number
    activeUserCount?: number
    totalChatCount?: number
    totalMessagesSent?: number
    totalUserCount?: number
}

export const HomeLayout = ({
    activeChatCount = 0,
    activeUserCount = 0,
    totalChatCount = 0,
    totalMessagesSent = 0,
    totalUserCount = 0
}: HomeLayoutProps = {}): View => ({
    type: 'home',
    blocks: [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: ':cyclone: *Whirl* lets you have fun, anonymous chats with random members of your Slack! Just click on the *Messages* tab to start whirlin’.'
            }
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Live Stats*\n
• :man-surfing: *${activeUserCount}* ${activeUserCount === 1 ? 'person is' : 'people are'} chatting right now${activeChatCount > 1 ? ` in *${activeChatCount}* different chats` : ''}.\n
• :busts_in_silhouette: *${totalChatCount}* chat${totalChatCount === 1 ? ' has' : 's have'} been started with Whirl.\n
• :speech_balloon: *${totalMessagesSent}* message${totalMessagesSent === 1 ? ' has' : 's have'} been sent in total by *${totalUserCount}* ${totalUserCount === 1 ? 'person' : 'people'}.`
            }
        }
    ]
})
