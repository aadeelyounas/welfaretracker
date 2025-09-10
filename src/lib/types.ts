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

export interface Employee {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface WelfareEvent {
  id: string;
  employeeId: string;
  employeeName?: string; // For display purposes
  department?: string; // For display purposes
  eventType: 'Welfare Call' | 'Welfare Visit' | 'Dog Handler Welfare';
  welfareDate: Date;
  dueDate: Date;
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  notes?: string;
  outcome?: 'positive' | 'concerns_raised' | 'follow_up_required' | 'escalated';
  nextDueDate?: Date;
  conductedBy?: string;
  conductedByName?: string;
  createdAt: string;
  updatedAt?: string;
  
  // Legacy fields for backward compatibility
  name?: string; // Maps to employeeName
  avatarUrl?: string; // From employee record
  followUpCompleted?: boolean; // Derived from status
}

export interface FollowUpAction {
  id: string;
  welfareEventId: string;
  employeeId: string;
  actionType: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  assignedToName?: string;
  completedDate?: Date;
  completionNotes?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WelfareSchedule {
  id: string;
  employeeId: string;
  scheduledDate: Date;
  eventType: 'Welfare Call' | 'Welfare Visit' | 'Dog Handler Welfare';
  status: 'scheduled' | 'completed' | 'rescheduled' | 'cancelled';
  welfareEventId?: string;
  createdAt: string;
}

export interface EmployeeWelfareSummary {
  employeeId: string;
  employeeIdCode: string;
  employeeName: string;
  department?: string;
  position?: string;
  welfareFrequencyDays: number;
  lastWelfareDate?: Date;
  nextDueDate?: Date;
  welfareStatus: 'overdue' | 'due_soon' | 'scheduled' | 'never_checked' | 'up_to_date';
  daysSinceLastCheck?: number;
  pendingFollowUps: number;
}

export interface WelfareHistory {
  employeeId: string;
  employeeIdCode: string;
  employeeName: string;
  department?: string;
  position?: string;
  eventId?: string;
  eventType?: string;
  welfareDate?: Date;
  dueDate?: Date;
  status?: string;
  outcome?: string;
  nextDueDate?: Date;
  notes?: string;
  conductedBy?: string;
  createdAt?: string;
  isOverdue: boolean;
  daysSinceCheck?: number;
  followUpCount: number;
  pendingFollowUps: number;
}

export interface WelfareStats {
  totalEmployees: number;
  overdueWelfareChecks: number;
  dueSoonWelfareChecks: number;
  completedThisWeek: number;
  completedThisMonth: number;
  pendingFollowUpActions: number;
  averageDaysBetweenChecks: number;
}

// Legacy interface for backward compatibility
export interface LegacyWelfareEvent {
  id: string;
  name: string;
  avatarUrl: string;
  eventType: 'Welfare Call' | 'Welfare Visit' | 'Dog Handler Welfare';
  welfareDate: Date;
  followUpCompleted: boolean;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

    