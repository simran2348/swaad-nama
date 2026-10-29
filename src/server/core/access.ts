import { settings } from '@devvit/web/server';
import { toAppStatus, type AppStatus } from '../../shared/access';

/** This subreddit's "App status" setting (open unless a mod closed it). */
export const getAppStatus = async (): Promise<AppStatus> => {
  try {
    return toAppStatus(await settings.get('appStatus'));
  } catch (error) {
    console.error('App status error:', error);
    return 'open';
  }
};
