import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

let adminApp: App

export const useAdminApp = (): App => {
  if (getApps().length) {
    adminApp = getApps()[0]!
    return adminApp
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON

  if (serviceAccountJson) {
    // 環境変数に JSON 文字列として埋め込む場合
    const serviceAccount = JSON.parse(serviceAccountJson)
    adminApp = initializeApp({ credential: cert(serviceAccount) })
  }
  else if (serviceAccountPath) {
    // ファイルパスで指定する場合
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require(serviceAccountPath)
    adminApp = initializeApp({ credential: cert(serviceAccount) })
  }
  else {
    // Cloud Run / Cloud Functions 上では ADC が自動で使われる
    adminApp = initializeApp()
  }

  return adminApp
}

export const useAdminFirestore = () => {
  useAdminApp()
  return getFirestore()
}
