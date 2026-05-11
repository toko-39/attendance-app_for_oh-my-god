export interface BreakRecord {
  start: Date
  end: Date | null
}

export interface AttendanceRecord {
  id: string
  userId: string
  date: string // "YYYY-MM-DD"
  clockIn: Date
  clockOut: Date | null
  breaks: BreakRecord[]
  totalWorkMinutes: number
  updatedAt: Date
}

export type AttendanceStatus = 'working' | 'on_break' | 'clocked_out' | 'absent'

export type ClockType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end'
