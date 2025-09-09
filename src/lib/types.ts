export type StatusVariant = "default" | "secondary" | "destructive" | "outline" | "accent" | "warning";

export interface WelfareEvent {
  id: string;
  name: string;
  avatarUrl: string;
  eventType: 'Check-in' | 'Incident' | 'Support Request' | 'Meeting';
  welfareDate: Date;
  followUpCompleted: boolean;
  notes: string;
}
