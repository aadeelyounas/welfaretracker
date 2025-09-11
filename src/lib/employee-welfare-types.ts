// Simplified types for employee-based welfare tracking

export type StatusVariant = "default" | "secondary" | "destructive" | "outline" | "accent" | "warning";

export interface User {
  id: string;
  username: string;
  password: string;
  role: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Simplified Employee interface - just name
export interface Employee {
  id: string;
  name: string;
  phoneNumber?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Welfare Schedule interface - tracks 14-day cycles
export interface WelfareSchedule {
  id: string;
  employeeId: string;
  currentCycleStart: Date;
  nextWelfareDue: Date;
  totalCyclesCompleted: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Welfare Activity interface - individual welfare events
export interface WelfareActivity {
  id: string;
  employeeId: string;
  welfareType: WelfareType;
  activityDate: Date;
  status: ActivityStatus;
  notes?: string;
  cycleNumber: number;
  daysSinceLast?: number;
  conductedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Legacy WelfareEvent interface for backwards compatibility
export interface WelfareEvent {
  id: string;
  name: string; // Employee name for display
  avatarUrl: string;
  eventType: WelfareType;
  welfareDate: Date;
  followUpCompleted: boolean;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

// Employee with welfare tracking information
export interface EmployeeWithWelfare extends Employee {
  schedule?: WelfareSchedule;
  recentActivities: WelfareActivity[];
  nextDue: Date;
  totalActivities: number;
  lastActivityDate?: Date;
  isOverdue: boolean;
  daysSinceLastWelfare?: number;
}

// Type definitions
export type WelfareType = 
  | 'Welfare Call' 
  | 'Welfare Visit' 
  | 'Dog Handler Welfare' 
  | 'Mental Health Check' 
  | 'General Welfare';

export type ActivityStatus = 
  | 'completed' 
  | 'pending' 
  | 'overdue' 
  | 'cancelled';

// Form interfaces
export interface CreateEmployeeForm {
  name: string;
}

export interface CreateWelfareActivityForm {
  employeeId: string;
  welfareType: WelfareType;
  activityDate: Date;
  notes?: string;
  conductedBy?: string;
}
