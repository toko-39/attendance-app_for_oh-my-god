import * as admin from 'firebase-admin'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { setGlobalOptions } from 'firebase-functions/v2'
import { checkNoClockIn } from './alerts/checkNoClockIn'
import { checkForgotClockOut } from './alerts/checkForgotClockOut'
import { checkLongWork } from './alerts/checkLongWork'

admin.initializeApp()

// Cloud Functions のデフォルトリージョン（東京）
setGlobalOptions({ region: 'asia-northeast1' })

/** 未出勤アラート：毎日 09:30 JST */
export const alertNoClockIn = onSchedule(
  { schedule: '30 0 * * *', timeZone: 'Asia/Tokyo' },
  async () => { await checkNoClockIn() }
)

/** 退勤忘れ通知：毎日 23:30 JST */
export const alertForgotClockOut = onSchedule(
  { schedule: '30 14 * * *', timeZone: 'UTC' }, // 23:30 JST = 14:30 UTC
  async () => { await checkForgotClockOut() }
)

/** 長時間労働警告：1時間ごと（10:00〜22:00 JST） */
export const alertLongWork = onSchedule(
  { schedule: '0 1-13 * * *', timeZone: 'UTC' }, // 10:00〜22:00 JST = 01:00〜13:00 UTC
  async () => { await checkLongWork() }
)
