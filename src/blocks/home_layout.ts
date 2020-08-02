import { ActionsBlock, Block, PlainTextElement, View } from '@slack/types'

// TODO: Remove this after there's a new release of `@slack/types` containing the
// changes made here: https://github.com/slackapi/node-slack-sdk/pull/1068
interface HeaderBlock extends Block {
  type: 'header'
  text: PlainTextElement
}

export interface HomeLayoutProps {
  isInChat?: boolean
  activeChatCount?: number
  activeUserCount?: number
  totalChatCount?: number
  totalMessagesSent?: number
  totalUserCount?: number
}

export const HomeLayout = ({
  isInChat = false,
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
        text:
          ':cyclone: *Whirl* lets you have fun, anonymous chats with random members of your Slack. Just click on the *Messages* tab to start whirlin’!'
      }
    },
    ...(!isInChat
      ? [
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                action_id: 'chat_start',
                style: 'primary',
                text: {
                  type: 'plain_text',
                  text: 'Join a chat'
                }
              }
            ]
          } as ActionsBlock
        ]
      : []),
    {
      type: 'divider'
    },
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Live Stats'
      }
    } as HeaderBlock,
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `
:man-surfing: *${activeUserCount}* ${
          activeUserCount === 1 ? 'person is' : 'people are'
        } chatting right now${
          activeChatCount > 1 ? ` in *${activeChatCount}* different chats` : ''
        }\n
:busts_in_silhouette: *${totalChatCount}* chat${
          totalChatCount === 1 ? ' has' : 's have'
        } been started with Whirl\n
:speech_balloon: *${totalMessagesSent}* message${
          totalMessagesSent === 1 ? ' has' : 's have'
        } been sent in total by *${totalUserCount}* ${
          totalUserCount === 1 ? 'person' : 'people'
        }`
      }
    },
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Quick Info'
      }
    } as HeaderBlock,
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `
• A read receipt in the form of an :eyes: reaction (or animal emoji like :monkey_face:, depending on the group size) will appear under a message when another user reads it.
• *\`/next\`:* Go to the next chat. Will add you to the waiting pool if there are no chats that can be immediately joined.
• *\`/end\`:* Ends the current chat.`
      }
    }
  ]
})
