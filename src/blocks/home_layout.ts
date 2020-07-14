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
            type: 'divider'
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `:bar_chart: *Live Stats*\n
• :man-surfing: *${activeUserCount}* ${activeUserCount === 1 ? 'person is' : 'people are'} chatting right now${activeChatCount > 1 ? ` in *${activeChatCount}* different chats` : ''}.\n
• :busts_in_silhouette: *${totalChatCount}* chat${totalChatCount === 1 ? ' has' : 's have'} been started with Whirl.\n
• :speech_balloon: *${totalMessagesSent}* message${totalMessagesSent === 1 ? ' has' : 's have'} been sent in total by *${totalUserCount}* ${totalUserCount === 1 ? 'person' : 'people'}.`
            }
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `:information_source: *Quick Info*\n
• A read receipt in the form of an :eyes: reaction (or animal emoji like :monkey_face:, depending on the group size) will appear under a message when an other user sees it.
• *\`/next\`:* Go to the next chat. Will add you to the waiting pool if no open chats are immediately available.
• *\`/end\`:* Ends the current chat, but doesn’t automatically start another chat.`
            }
        }
    ]
})
