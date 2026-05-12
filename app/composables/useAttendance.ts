import type { Timestamp } from "firebase/firestore";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import type { AttendanceRecord, AttendanceStatus } from "@@/types/attendance";

export const useAttendance = (date: string) => {
  const records = ref<AttendanceRecord[]>([]);
  const loading = ref(true);

  const db = useFirestore();
  const q = query(
    collection(db, "attendance_records"),
    where("date", "==", date),
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      records.value = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          clockIn: (data.clockIn as Timestamp)?.toDate(),
          clockOut: (data.clockOut as Timestamp)?.toDate() ?? null,
          breaks: (data.breaks ?? []).map(
            (b: { start: Timestamp; end: Timestamp | null }) => ({
              start: b.start?.toDate(),
              end: b.end?.toDate() ?? null,
            }),
          ),
          updatedAt: (data.updatedAt as Timestamp)?.toDate(),
        } as AttendanceRecord;
      });
      loading.value = false;
    },
    (error) => {
      console.error("[useAttendance] Firestore error:", error);
      loading.value = false;
    },
  );

  onUnmounted(unsubscribe);

  return { records, loading };
};

export const getAttendanceStatus = (
  record: AttendanceRecord | undefined,
): AttendanceStatus => {
  if (!record) return "absent";
  if (record.clockOut) return "clocked_out";
  const lastBreak = record.breaks.at(-1);
  if (lastBreak && !lastBreak.end) return "on_break";
  return "working";
};

export const calcTotalWorkMinutes = (record: AttendanceRecord): number => {
  const end = record.clockOut ?? new Date();
  const totalMs = end.getTime() - record.clockIn.getTime();
  const breakMs = record.breaks.reduce((acc, b) => {
    if (!b.end) return acc;
    return acc + (b.end.getTime() - b.start.getTime());
  }, 0);
  return Math.floor((totalMs - breakMs) / 60000);
};
