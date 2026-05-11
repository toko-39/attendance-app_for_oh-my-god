export interface User {
  uid: string
  lineUserId: string
  name: string
  email: string
  role: 'admin' | 'member'
  shiftType: string
  createdAt: Date
}
