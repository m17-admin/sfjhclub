
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
  date: string; 
  records: Record<string, AttendanceStatus>;
  notes?: string;
  updatedAt?: number; // 用於比對同步順序
}

export interface LeaveRecord {
  id: string;
  memberId: string;
  studentName: string;
  date: string;
  reason: string;
}

export type UserRole = 'admin' | 'teacher' | 'class_teacher';

export interface User {
  username: string;
  role: UserRole;
  name: string;
  assignedClubId?: string;
  assignedClassName?: string;
  syncCode?: string; // 使用者指定的同步代碼
}

export interface AppState {
  clubs: Club[];
  attendanceRecords: AttendanceRecord[];
  leaveRecords: LeaveRecord[];
  syncCode?: string;
  lastSyncedAt?: number;
}
