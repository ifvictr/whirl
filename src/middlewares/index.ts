import {
  Context,
  MessageEvent,
  NextFn,
  SlackEventMiddlewareArgs
} from '@slack/bolt'
import Manager from '../manager'

const filterEvent = (filterFn: (event: MessageEvent) => boolean) => {
  return async ({
    event,
    next
  }: SlackEventMiddlewareArgs<'message'> & { next?: NextFn }) => {
    if (filterFn(event)) {
      await next!()
    }
  }
}

export const channelType = (type: string) =>
  filterEvent((event: MessageEvent) => event.channel_type === type)

// TODO: Use the proper type for middleware args because this can be applied to
// other events besides the `message` event.
export const addManagerContext = async ({
  body,
  context,
  next
}: SlackEventMiddlewareArgs<'message'> & {
  context: Context
  next?: NextFn
}) => {
  // Slack's API doesn't return the team ID in a consistent format. This just
  // pulls the value depending on the shape of the payload.
  const teamId = 'team_id' in body ? body.team_id : body.team.id
  context.manager = new Manager(teamId)

  await next!()
}
