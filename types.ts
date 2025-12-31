
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED'
}

export interface Member {
  id: string;
  name: string;
  studentId?: string;
  className: string;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  members: Member[];
  createdAt: number;
}

export interface AttendanceRecord {
  id: string;
  clubId: string;
  date: string; // ISO String
  records: Record<string, AttendanceStatus>; // memberId -> status
  notes?: string;
}

export interface LeaveRecord {
  id: string;
  memberId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  reason: string;
}

export type UserRole = 'admin' | 'teacher' | 'class_teacher';

export interface User {
  username: string;
  role: UserRole;
  name: string;
  assignedClubId?: string;
  assignedClassName?: string;
}

export interface AppState {
  clubs: Club[];
  attendanceRecords: AttendanceRecord[];
  leaveRecords: LeaveRecord[]; // 新增：請假紀錄
}
