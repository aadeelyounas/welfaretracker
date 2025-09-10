export type StatusVariant = "default" | "secondary" | "destructive" | "outline" | "accent" | "warning";

export interface WelfareEvent {
  id: string;
  name: string;
  avatarUrl: string;
  eventType: 'Welfare Call' | 'Welfare Visit' | 'Dog Handler Welfare';
  welfareDate: Date;
  followUpCompleted: boolean;
  notes: string;
}

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

    