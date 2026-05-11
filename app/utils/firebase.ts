import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

let app: FirebaseApp

export const useFirebaseApp = () => {
  if (!getApps().length) {
    const config = useRuntimeConfig()
    app = initializeApp({
      apiKey: config.public.firebaseApiKey,
      authDomain: config.public.firebaseAuthDomain,
      projectId: config.public.firebaseProjectId,
      storageBucket: config.public.firebaseStorageBucket,
      messagingSenderId: config.public.firebaseMessagingSenderId,
      appId: config.public.firebaseAppId
    })
  }
  else {
    app = getApps()[0]!
  }
  return app
}

export const useFirebaseAuth = () => getAuth(useFirebaseApp())

export const useFirestore = () => getFirestore(useFirebaseApp())
