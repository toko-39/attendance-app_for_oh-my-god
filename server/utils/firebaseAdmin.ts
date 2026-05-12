import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'

let adminApp: App

export const useAdminApp = (): App => {
  if (getApps().length) {
    adminApp = getApps()[0]!
    return adminApp
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH

  if (serviceAccountJson) {
    adminApp = initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) })
  }
  else if (serviceAccountPath) {
    // process.cwd() = プロジェクトルート
    const absolutePath = resolve(process.cwd(), serviceAccountPath.replace(/^\.\//, ''))
    const serviceAccount = JSON.parse(readFileSync(absolutePath, 'utf-8'))
    adminApp = initializeApp({ credential: cert(serviceAccount) })
  }
  else {
    // Cloud Run 上では Application Default Credentials を使用
    adminApp = initializeApp()
  }

  return adminApp
}

export const useAdminFirestore = () => {
  useAdminApp()
  return getFirestore()
}
