import { MessageEvent, NextFn, SlackEventMiddlewareArgs } from '@slack/bolt'

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
