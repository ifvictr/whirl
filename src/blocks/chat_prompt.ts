export interface ChatPromptProps {
    isExistingUser?: boolean
}

export const ChatPrompt = ({
    isExistingUser = true
}: ChatPromptProps = {}) => ([
    {
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: isExistingUser
                ? 'You left the chat. Want to join another one?'
                : ':wave: Hey, welcome to Whirl! Here, you can have fun, completely anonymous chats with random members of your Slack. Just click below to get started.'
        }
    },
    {
        type: 'actions',
        elements: [
            {
                type: 'button',
                action_id: 'chat_start',
                style: 'primary',
                text: {
                    type: 'plain_text',
                    text: `Join ${isExistingUser ? 'another' : 'a'} chat`
                }
            }
        ]
    }
])
