"use client";

import * as React from "react";
import { addDays, differenceInDays, format, startOfToday } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  User,
  UserX,
  Calendar,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { LogoutButton } from "./logout-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Schemas
const createEmployeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phoneNumber: z.string()
    .optional()
    .or(z.literal(""))
    .refine((val) => {
      if (!val || val === "") return true;
      // UK phone number validation - supports various formats
      const ukPhoneRegex = /^(?:(?:\+44\s?|0044\s?|0)(?:\d{2}\s?\d{4}\s?\d{4}|\d{3}\s?\d{3}\s?\d{4}|\d{4}\s?\d{6}|\d{5}\s?\d{5}|\d{1}\s?\d{3}\s?\d{3}\s?\d{3}))$/;
      return ukPhoneRegex.test(val.replace(/\s/g, ''));
    }, "Please enter a valid UK phone number"),
});

const editEmployeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phoneNumber: z.string()
    .optional()
    .or(z.literal(""))
    .refine((val) => {
      if (!val || val === "") return true;
      // UK phone number validation - supports various formats
      const ukPhoneRegex = /^(?:(?:\+44\s?|0044\s?|0)(?:\d{2}\s?\d{4}\s?\d{4}|\d{3}\s?\d{3}\s?\d{4}|\d{4}\s?\d{6}|\d{5}\s?\d{5}|\d{1}\s?\d{3}\s?\d{3}\s?\d{3}))$/;
      return ukPhoneRegex.test(val.replace(/\s/g, ''));
    }, "Please enter a valid UK phone number"),
  active: z.boolean(),
});

const createWelfareActivitySchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  welfareType: z.enum(['Welfare Call', 'Welfare Visit', 'Dog Handler Welfare', 'Mental Health Check', 'General Welfare']),
  activityDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  conductedBy: z.string().optional(),
});

// Types for the new system
interface Employee {
  id: string;
  name: string;
  phoneNumber?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WelfareActivity {
  id: string;
  employeeId: string;
  welfareType: string;
  activityDate: Date;
  status: string;
  notes?: string;
  cycleNumber: number;
  daysSinceLast?: number;
  conductedBy?: string;
  createdAt: string;
  updatedAt: string;
  employeeName?: string;
}

interface EmployeeWithWelfare extends Employee {
  nextDue: Date;
  totalActivities: number;
  lastActivityDate?: Date;
  isOverdue: boolean;
  daysSinceLastWelfare?: number;
  recentActivities: WelfareActivity[];
}

export function EmployeeWelfareTracker() {
  const [employees, setEmployees] = React.useState<EmployeeWithWelfare[]>([]);
  const [activities, setActivities] = React.useState<WelfareActivity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedTab, setSelectedTab] = React.useState("dashboard");
  const [showAddEmployee, setShowAddEmployee] = React.useState(false);
  const [showAddActivity, setShowAddActivity] = React.useState(false);
  const [showEditEmployee, setShowEditEmployee] = React.useState(false);
  const [showDeleteEmployee, setShowDeleteEmployee] = React.useState(false);
  const [showEmployeeHistory, setShowEmployeeHistory] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState<EmployeeWithWelfare | null>(null);
  const [deletingEmployee, setDeletingEmployee] = React.useState<EmployeeWithWelfare | null>(null);
  const [viewingEmployee, setViewingEmployee] = React.useState<EmployeeWithWelfare | null>(null);
  const [recordingEmployee, setRecordingEmployee] = React.useState<EmployeeWithWelfare | null>(null);
  const [employeeHistory, setEmployeeHistory] = React.useState<WelfareActivity[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalActivities, setTotalActivities] = React.useState(0);
  const activitiesPerPage = 10;
  
  // Employee history pagination
  const [historyCurrentPage, setHistoryCurrentPage] = React.useState(1);
  const [totalEmployeeActivities, setTotalEmployeeActivities] = React.useState(0);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const historyPerPage = 8;
  const [clearing, setClearing] = React.useState(false);
  
  const { toast } = useToast();

  // Forms
  const employeeForm = useForm<z.infer<typeof createEmployeeSchema>>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: { name: "", phoneNumber: "" },
  });

  const activityForm = useForm<z.infer<typeof createWelfareActivitySchema>>({
    resolver: zodResolver(createWelfareActivitySchema),
    defaultValues: {
      employeeId: "",
      welfareType: "Welfare Call",
      activityDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      conductedBy: "",
    },
  });

  const editEmployeeForm = useForm<z.infer<typeof editEmployeeSchema>>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: { name: "", phoneNumber: "", active: true },
  });

  // Fetch data
  const fetchEmployees = React.useCallback(async () => {
    try {
      const response = await fetch('/api/employees?includeWelfare=true');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, []);

  const fetchActivities = React.useCallback(async (page: number = 1) => {
    try {
      const limit = activitiesPerPage;
      const offset = (page - 1) * limit;
      const response = await fetch(`/api/welfare-activities?limit=${limit}&offset=${offset}&includeTotal=true`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || data);
        if (data.total !== undefined) {
          setTotalActivities(data.total);
        }
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  }, [activitiesPerPage]);

  // Hard clear all employee and activity caches
  const handleHardClear = React.useCallback(async () => {
    setClearing(true);
    try {
      const response = await fetch('/api/cache/clear', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear cache');
      }
      
      const result = await response.json();
      console.log('🧹 Hard cache cleared:', result);
      
      // Force refresh all data after clearing cache
      setLoading(true);
      await Promise.all([fetchEmployees(), fetchActivities(currentPage)]);
      setLoading(false);
      
      toast({
        title: "Cache cleared successfully",
        description: "All employee and activity caches have been cleared and data refreshed.",
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast({
        title: "Cache clear failed",
        description: "Failed to clear cache. Please try again.",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  }, [fetchEmployees, fetchActivities, currentPage, toast]);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchEmployees(), fetchActivities(currentPage)]);
      setLoading(false);
    };
    loadData();
  }, [fetchEmployees, fetchActivities, currentPage]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Create employee
  const onCreateEmployee = async (values: z.infer<typeof createEmployeeSchema>) => {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast({ title: "✅ Employee added successfully!" });
        employeeForm.reset();
        setShowAddEmployee(false);
        fetchEmployees();
      } else {
        throw new Error('Failed to create employee');
      }
    } catch (error) {
      toast({ title: "❌ Error adding employee", variant: "destructive" });
    }
  };

  // Create welfare activity
  const onCreateActivity = async (values: z.infer<typeof createWelfareActivitySchema>) => {
    try {
      console.log('Creating welfare activity:', values); // Debug log
      
      // Find the employee to get their name
      const employee = employees.find(emp => emp.id === values.employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }
      
      const response = await fetch('/api/welfare-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: values.employeeId,
          welfareType: values.welfareType,
          activityDate: values.activityDate,
          conductedBy: values.conductedBy || '',
          notes: values.notes || ''
        }),
      });

      if (response.ok) {
        toast({ title: "✅ Welfare activity recorded successfully!" });
        activityForm.reset();
        setShowAddActivity(false);
        setRecordingEmployee(null);
        fetchEmployees();
        fetchActivities(currentPage);
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.message || 'Failed to create activity');
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      toast({ title: "❌ Error recording activity", variant: "destructive" });
    }
  };

  // Edit employee
  const onEditEmployee = async (values: z.infer<typeof editEmployeeSchema>) => {
    if (!editingEmployee) return;
    
    try {
      const response = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast({ title: "✅ Employee updated successfully!" });
        editEmployeeForm.reset();
        setShowEditEmployee(false);
        setEditingEmployee(null);
        fetchEmployees();
      } else {
        throw new Error('Failed to update employee');
      }
    } catch (error) {
      toast({ title: "❌ Error updating employee", variant: "destructive" });
    }
  };

  // Delete employee
  const onDeleteEmployee = async () => {
    if (!deletingEmployee) return;
    
    try {
      const response = await fetch(`/api/employees/${deletingEmployee.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: "✅ Employee deleted successfully!" });
        setShowDeleteEmployee(false);
        setDeletingEmployee(null);
        fetchEmployees();
      } else {
        throw new Error('Failed to delete employee');
      }
    } catch (error) {
      toast({ title: "❌ Error deleting employee", variant: "destructive" });
    }
  };

  // Handle edit button click
  const handleEditEmployee = (employee: EmployeeWithWelfare) => {
    setEditingEmployee(employee);
    editEmployeeForm.setValue('name', employee.name);
    editEmployeeForm.setValue('phoneNumber', employee.phoneNumber || '');
    editEmployeeForm.setValue('active', employee.active);
    setShowEditEmployee(true);
  };

  // Handle delete button click
  const handleDeleteEmployee = (employee: EmployeeWithWelfare) => {
    setDeletingEmployee(employee);
    setShowDeleteEmployee(true);
  };

  // Handle record activity button click
  const handleRecordActivity = (employee: EmployeeWithWelfare) => {
    setRecordingEmployee(employee);
    activityForm.setValue('employeeId', employee.id);
    activityForm.setValue('welfareType', 'Welfare Call');
    setShowAddActivity(true);
  };

  // Load employee history with pagination
  const loadEmployeeHistory = async (employee: EmployeeWithWelfare, page: number = 1) => {
    setHistoryLoading(true);
    try {
      const limit = historyPerPage;
      const offset = (page - 1) * limit;
      
      // Fetch paginated welfare activities for this specific employee
      const activitiesResponse = await fetch(
        `/api/welfare-activities?employeeId=${employee.id}&limit=${limit}&offset=${offset}&includeTotal=true`
      );
      
      if (activitiesResponse.ok) {
        const data = await activitiesResponse.json();
        const activities = data.activities || data;
        const total = data.total || activities.length;
        
        // Transform to unified format
        const combinedHistory = activities.map((activity: any) => ({
          id: activity.id,
          employeeId: activity.employeeId,
          employeeName: activity.employeeName,
          welfareType: activity.welfareType,
          activityDate: activity.activityDate,
          status: activity.status,
          notes: activity.notes,
          cycleNumber: activity.cycleNumber || 1,
          conductedBy: activity.conductedBy,
          createdAt: activity.createdAt,
          source: 'activity'
        }));
        
        console.log(`Loaded page ${page} of ${employee.name}'s history: ${activities.length} records`);
        setEmployeeHistory(combinedHistory);
        setTotalEmployeeActivities(total);
      } else {
        console.error('Failed to fetch employee history');
        setEmployeeHistory([]);
        setTotalEmployeeActivities(0);
      }
    } catch (error) {
      console.error('Error fetching employee history:', error);
      setEmployeeHistory([]);
      setTotalEmployeeActivities(0);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Handle view employee history
  const handleViewEmployeeHistory = async (employee: EmployeeWithWelfare) => {
    setViewingEmployee(employee);
    setHistoryCurrentPage(1);
    setShowEmployeeHistory(true);
    await loadEmployeeHistory(employee, 1);
  };

  // Handle history page change
  const handleHistoryPageChange = async (page: number) => {
    setHistoryCurrentPage(page);
    if (viewingEmployee) {
      await loadEmployeeHistory(viewingEmployee, page);
    }
  };

  // Filter data
  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const overdueEmployees = employees.filter(emp => emp.isOverdue && emp.active);
  const dueTodayEmployees = employees.filter(emp => {
    const today = startOfToday();
    const dueDate = new Date(emp.nextDue);
    return format(dueDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') && emp.active;
  });

  // Stats
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(emp => emp.active).length;
  const overdueCount = overdueEmployees.length;
  const dueTodayCount = dueTodayEmployees.length;
  const completedThisWeek = activities.filter(activity => {
    const activityDate = new Date(activity.activityDate);
    const weekAgo = addDays(new Date(), -7);
    return activityDate >= weekAgo && activity.status === 'completed';
  }).length;

  const getStatusBadge = (employee: EmployeeWithWelfare) => {
    if (!employee.active) {
      return (
        <Badge className="font-medium shadow-sm text-gray-600 bg-gray-200 border-gray-300">
          <UserX className="h-3 w-3 mr-1" />
          Inactive
        </Badge>
      );
    }
    if (employee.isOverdue) {
      return (
        <Badge className="font-medium shadow-sm text-white" style={{
          background: 'linear-gradient(135deg, #8a1b58 0%, #6d1545 100%)'
        }}>
          <AlertTriangle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      );
    }
    if (dueTodayEmployees.includes(employee)) {
      return (
        <Badge className="font-medium shadow-sm text-white" style={{
          background: 'linear-gradient(135deg, #b02470 0%, #9e1f62 100%)',
          border: '1px solid #9e1f62'
        }}>
          <Clock className="h-3 w-3 mr-1" />
          Due Today
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="font-medium shadow-sm border text-white" style={{
        background: 'linear-gradient(135deg, rgba(158, 31, 98, 0.8) 0%, rgba(176, 36, 112, 0.9) 100%)',
        borderColor: '#9e1f62'
      }}>
        <CheckCircle2 className="h-3 w-3 mr-1" />
        On Track
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-25 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="rounded-2xl p-8 shadow-2xl border relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 50%, #8a1b58 100%)', borderColor: '#9e1f62' }}>
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 left-4 w-16 h-16 border-2 border-white rounded-full"></div>
              <div className="absolute top-8 right-8 w-8 h-8 border border-white rounded-full"></div>
              <div className="absolute bottom-6 left-8 w-12 h-12 border border-white rounded-full"></div>
              <div className="absolute bottom-4 right-4 w-6 h-6 bg-white rounded-full"></div>
            </div>
            
            <div className="mb-6 relative z-10">
              <div className="relative">
                {/* Creative logo backdrop with subtle shadow */}
                <div className="absolute inset-0 bg-black/20 blur-sm transform translate-x-1 translate-y-1 rounded-xl"></div>
                <div className="relative backdrop-blur-sm rounded-xl p-4 border border-white/20" style={{ background: 'linear-gradient(135deg, rgba(158, 31, 98, 0.3) 0%, rgba(176, 36, 112, 0.4) 100%)' }}>
                  <img 
                    src="/ashridge-logo.png" 
                    alt="Ashridge Group Logo" 
                    className="h-20 w-auto mx-auto object-contain filter drop-shadow-lg"
                  />
                </div>
              </div>
            </div>
            <div className="relative z-10">
              <Clock className="mx-auto h-12 w-12 text-white animate-spin mb-4 drop-shadow-lg" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-md relative z-10">Welfare Tracker</h2>
            <p className="text-pink-100 mb-4 relative z-10">Loading employee welfare data...</p>
            <div className="w-48 mx-auto bg-white/20 backdrop-blur-sm rounded-full h-2 relative z-10">
              <div className="bg-gradient-to-r from-white to-pink-200 h-2 rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6" style={{ background: 'linear-gradient(135deg, rgba(158, 31, 98, 0.05) 0%, rgba(176, 36, 112, 0.08) 50%, rgba(138, 27, 88, 0.03) 100%)' }}>
      <div className="mx-auto max-w-7xl">
        {/* Enhanced Branded Header */}
        <div className="mb-6 md:mb-8">
          <div className="rounded-2xl p-4 sm:p-6 md:p-8 text-white shadow-2xl" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 50%, #8a1b58 100%)' }}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4 sm:space-x-6">
                <img 
                  src="/ashridge-logo.png" 
                  alt="Ashridge Group Logo" 
                  className="h-12 sm:h-16 w-auto object-contain"
                />
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold drop-shadow-md">
                    Welfare Tracker
                  </h1>
                  <p className="text-pink-100 text-sm sm:text-base md:text-lg drop-shadow-sm hidden md:block">
                    Comprehensive employee welfare monitoring system
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-auto flex items-center gap-2">
                <Button 
                  onClick={handleHardClear} 
                  disabled={clearing || loading}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  title="Clear all employee and activity caches"
                >
                  <Trash2 className={`h-4 w-4 ${clearing ? 'animate-pulse' : ''}`} />
                  {clearing ? 'Clearing...' : 'Clear Cache'}
                </Button>
                <LogoutButton />
              </div>
            </div>
            <div className="mt-4 border-t border-white/20 pt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-pink-200">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>14-day monitoring cycles</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{totalEmployees} employees</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>{totalActivities} activities</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-grid" style={{ background: 'rgba(158, 31, 98, 0.1)' }}>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="employees" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Employees</span>
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Activities</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="dashboard" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stat Cards */}
              <Card className="shadow-lg border" style={{ borderColor: '#9e1f62' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: '#9e1f62' }}>Total Employees</CardTitle>
                  <User className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: '#8a1b58' }}>{totalEmployees}</div>
                  <p className="text-xs text-gray-500">{activeEmployees} active</p>
                </CardContent>
              </Card>
              <Card className="shadow-lg border" style={{ borderColor: '#9e1f62' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: '#9e1f62' }}>Overdue Checks</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: '#8a1b58' }}>{overdueCount}</div>
                  <p className="text-xs text-gray-500">Action required</p>
                </CardContent>
              </Card>
              <Card className="shadow-lg border" style={{ borderColor: '#9e1f62' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: '#9e1f62' }}>Due Today</CardTitle>
                  <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: '#8a1b58' }}>{dueTodayCount}</div>
                  <p className="text-xs text-gray-500">To be completed</p>
                </CardContent>
              </Card>
              <Card className="shadow-lg border" style={{ borderColor: '#9e1f62' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: '#9e1f62' }}>Completed This Week</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: '#8a1b58' }}>{completedThisWeek}</div>
                  <p className="text-xs text-gray-500">Welfare activities</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Overdue Employees Card */}
              <Card className="shadow-lg border" style={{ borderColor: '#9e1f62' }}>
                <CardHeader className="text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 50%, #8a1b58 100%)' }}>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="bg-white/20 rounded-full p-2">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    Overdue Welfare Checks
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {overdueCount === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                      <p className="font-medium">No overdue checks. Great job!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {overdueEmployees.map((employee) => (
                        <div key={employee.id} className="flex flex-col sm:flex-row items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                          <div className="flex items-center gap-3 mb-2 sm:mb-0">
                            <Avatar>
                              <AvatarFallback className="bg-red-200 text-red-700 font-bold">
                                {employee.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-red-800">{employee.name}</p>
                              <p className="text-xs text-red-600">
                                Due {(() => {
                                  try {
                                    const date = new Date(employee.nextDue);
                                    return isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'PP');
                                  } catch (error) {
                                    return 'Invalid Date';
                                  }
                                })()} ({employee.daysSinceLastWelfare} days ago)
                              </p>
                              <p className="text-xs text-gray-500">
                                {employee.totalActivities || 0} welfare checks total
                              </p>
                            </div>
                          </div>
                          <div className="w-full sm:w-auto">
                            <Button 
                              size="sm" 
                              onClick={() => handleRecordActivity(employee)}
                              className="w-full text-white font-medium"
                              style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)' }}
                            >
                              <Activity className="h-4 w-4 mr-2" />
                              Record Check
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Due Today Card */}
              <Card className="shadow-lg border" style={{ borderColor: '#9e1f62' }}>
                <CardHeader className="text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 50%, #8a1b58 100%)' }}>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="bg-white/20 rounded-full p-2">
                      <Clock className="h-5 w-5" />
                    </div>
                    Welfare Checks Due Today
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {dueTodayCount === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                      <p className="font-medium">No checks due today.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dueTodayEmployees.map((employee) => (
                        <div key={employee.id} className="flex flex-col sm:flex-row items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                          <div className="flex items-center gap-3 mb-2 sm:mb-0">
                            <Avatar>
                              <AvatarFallback className="bg-blue-200 text-blue-700 font-bold">
                                {employee.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-blue-800">{employee.name}</p>
                              <p className="text-xs text-blue-600">
                                Last check: {employee.daysSinceLastWelfare} days ago
                              </p>
                              <p className="text-xs text-gray-500">
                                {employee.totalActivities || 0} welfare checks total
                              </p>
                            </div>
                          </div>
                          <div className="w-full sm:w-auto">
                            <Button 
                              size="sm" 
                              onClick={() => handleRecordActivity(employee)}
                              className="w-full text-white font-medium"
                              style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)' }}
                            >
                              <Activity className="h-4 w-4 mr-2" />
                              Record Check
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employees" className="mt-6 space-y-6">
            <Card className="shadow-lg border" style={{ borderColor: '#9e1f62' }}>
              <CardHeader className="text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 50%, #8a1b58 100%)' }}>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="bg-white/20 rounded-full p-2">
                      <User className="h-5 w-5" />
                    </div>
                    Employee Welfare Tracking
                  </CardTitle>
                  <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
                    <DialogTrigger asChild>
                      <Button className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white border-white/30 font-medium">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Employee
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2" style={{ color: '#9e1f62' }}>
                          <User className="h-5 w-5" />
                          Add New Employee
                        </DialogTitle>
                        <DialogDescription>
                          Add a new employee to the welfare tracking system with automated 14-day monitoring cycles.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={employeeForm.handleSubmit(onCreateEmployee)}>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name" className="font-medium" style={{ color: '#9e1f62' }}>Employee Name</Label>
                            <Input
                              id="name"
                              {...employeeForm.register("name")}
                              placeholder="Enter full name"
                              className="border focus:border" 
                              style={{ borderColor: '#9e1f62', '--tw-ring-color': '#9e1f62' } as any}
                            />
                            {employeeForm.formState.errors.name && (
                              <p className="text-sm mt-1" style={{ color: '#8a1b58' }}>
                                {employeeForm.formState.errors.name.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="phoneNumber" className="font-medium" style={{ color: '#9e1f62' }}>Phone Number (UK format)</Label>
                            <Input
                              id="phoneNumber"
                              {...employeeForm.register("phoneNumber")}
                              placeholder="e.g., +44 20 1234 5678 or 0207 123 4567"
                              className="border focus:border" 
                              style={{ borderColor: '#9e1f62', '--tw-ring-color': '#9e1f62' } as any}
                            />
                            {employeeForm.formState.errors.phoneNumber && (
                              <p className="text-sm mt-1" style={{ color: '#8a1b58' }}>
                                {employeeForm.formState.errors.phoneNumber.message}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Optional - supports various UK formats</p>
                          </div>
                        </div>
                        <DialogFooter className="mt-6">
                          <Button type="submit" className="text-white font-medium" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)' }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Employee
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
                  <div className="relative flex-1 w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                    <Input
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/20 border-white/30 placeholder:text-white/70 text-white w-full"
                    />
                  </div>
                  <div className="text-white/80 text-sm">
                    {filteredEmployees.length} of {totalEmployees} employees
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile View: Card List */}
                <div className="md:hidden">
                  {filteredEmployees.map((employee) => (
                    <div key={employee.id} className={`border-b p-4 space-y-3 ${!employee.active ? 'bg-gray-50 opacity-75' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-gray-200 font-bold" style={{ color: '#9e1f62' }}>
                              {employee.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <button 
                              onClick={() => handleViewEmployeeHistory(employee)}
                              className="font-bold hover:underline cursor-pointer transition-colors duration-200" 
                              style={{ color: '#8a1b58' }}
                            >
                              {employee.name}
                            </button>
                            <p className="text-xs text-gray-500">{employee.id}</p>
                            {employee.phoneNumber && (
                              <p className="text-xs text-gray-600">📞 {employee.phoneNumber}</p>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border text-white font-medium shadow-sm"
                              style={{
                                background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)',
                                borderColor: '#9e1f62'
                              }}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {employee.active && (
                              <DropdownMenuItem onClick={() => handleRecordActivity(employee)} className="cursor-pointer">
                                <Activity className="h-4 w-4 mr-2" />
                                Record Activity
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleEditEmployee(employee)} className="cursor-pointer">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Employee
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteEmployee(employee)} className="cursor-pointer text-red-600 focus:text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Employee
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-600">Status:</span>
                          {getStatusBadge(employee)}
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-600">Next Due</p>
                          <p className="font-bold" style={{ color: '#8a1b58' }}>{(() => {
                            try {
                              const date = new Date(employee.nextDue);
                              return isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'PP');
                            } catch (error) {
                              return 'Invalid Date';
                            }
                          })()}</p>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">
                            Last check: {employee.daysSinceLastWelfare !== null 
                              ? `${employee.daysSinceLastWelfare} days ago` 
                              : 'N/A'
                            }
                          </span>
                          <span className="text-gray-500">
                            {employee.totalActivities || 0} welfare checks
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold" style={{ color: '#9e1f62' }}>Employee</TableHead>
                        <TableHead className="font-semibold" style={{ color: '#9e1f62' }}>Phone</TableHead>
                        <TableHead className="font-semibold" style={{ color: '#9e1f62' }}>Welfare Status</TableHead>
                        <TableHead className="font-semibold" style={{ color: '#9e1f62' }}>Next Due Date</TableHead>
                        <TableHead className="font-semibold" style={{ color: '#9e1f62' }}>Last Check</TableHead>
                        <TableHead className="font-semibold" style={{ color: '#9e1f62' }}>Status</TableHead>
                        <TableHead className="text-right font-semibold" style={{ color: '#9e1f62' }}>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                            No employees found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEmployees.map((employee) => (
                          <TableRow key={employee.id} className={`hover:bg-pink-50/50 ${!employee.active ? 'bg-gray-50 opacity-75' : ''}`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback className="bg-gray-200 font-bold" style={{ color: '#9e1f62' }}>
                                    {employee.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <button 
                                    onClick={() => handleViewEmployeeHistory(employee)}
                                    className="font-bold hover:underline cursor-pointer transition-colors duration-200" 
                                    style={{ color: '#8a1b58' }}
                                  >
                                    {employee.name}
                                  </button>
                                  <p className="text-xs text-gray-500">{employee.id}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">
                                {employee.phoneNumber || '-'}
                              </span>
                            </TableCell>
                            <TableCell>{getStatusBadge(employee)}</TableCell>
                            <TableCell className="font-medium">{format(new Date(employee.nextDue), 'PP')}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm">
                                  {employee.daysSinceLastWelfare !== null 
                                    ? `${employee.daysSinceLastWelfare} days ago` 
                                    : 'N/A'
                                  }
                                </span>
                                <span className="text-xs text-gray-500">
                                  {employee.totalActivities || 0} welfare checks
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={employee.active ? 'default' : 'destructive'} className={employee.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {employee.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="border text-white font-medium shadow-sm hover:shadow-md transition-all duration-200"
                                    style={{
                                      background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)',
                                      borderColor: '#9e1f62'
                                    }}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  {employee.active && (
                                    <DropdownMenuItem 
                                      onClick={() => handleRecordActivity(employee)}
                                      className="cursor-pointer"
                                    >
                                      <Activity className="h-4 w-4 mr-2" />
                                      Record Activity
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => handleEditEmployee(employee)}
                                    className="cursor-pointer"
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Employee
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteEmployee(employee)}
                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Employee
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities" className="mt-6">
            <Card className="shadow-lg border" style={{ borderColor: '#9e1f62' }}>
              <CardHeader className="text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 50%, #8a1b58 100%)' }}>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="bg-white/20 rounded-full p-2">
                    <Activity className="h-5 w-5" />
                  </div>
                  Recent Welfare Activities
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile View: Card List */}
                <div className="md:hidden">
                  {activities.map((activity) => (
                    <div key={activity.id} className="border-b p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-bold" style={{ color: '#8a1b58' }}>{activity.employeeName || 'Unknown'}</p>
                        <Badge variant="outline">{activity.welfareType}</Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium text-gray-600">Date:</span> {(() => {
                          try {
                            const date = new Date(activity.activityDate);
                            return isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'PP');
                          } catch (error) {
                            return 'Invalid Date';
                          }
                        })()}</p>
                        <p><span className="font-medium text-gray-600">Conducted By:</span> {activity.conductedBy || '-'}</p>
                        <p><span className="font-medium text-gray-600">Notes:</span> {activity.notes || '-'}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Cycle #</TableHead>
                        <TableHead>Conducted By</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell className="font-medium">
                            {activity.employeeName || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{activity.welfareType}</Badge>
                          </TableCell>
                          <TableCell>{(() => {
                            try {
                              const date = new Date(activity.activityDate);
                              return isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'PP');
                            } catch (error) {
                              return 'Invalid Date';
                            }
                          })()}</TableCell>
                          <TableCell>#{activity.cycleNumber}</TableCell>
                          <TableCell>{activity.conductedBy || '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {activity.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>

              {/* Pagination Controls */}
              <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * activitiesPerPage) + 1} to {Math.min(currentPage * activitiesPerPage, totalActivities)} of {totalActivities} activities
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="border text-gray-700 hover:bg-gray-50"
                    style={{ borderColor: '#9e1f62' }}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(3, Math.ceil(totalActivities / activitiesPerPage)) }, (_, i) => {
                      const totalPages = Math.ceil(totalActivities / activitiesPerPage);
                      let pageNum;
                      
                      if (totalPages <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage <= 2) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 1) {
                        pageNum = totalPages - 2 + i;
                      } else {
                        pageNum = currentPage - 1 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className={currentPage === pageNum 
                            ? "text-white font-medium" 
                            : "border text-gray-700 hover:bg-gray-50"
                          }
                          style={currentPage === pageNum 
                            ? { background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)' }
                            : { borderColor: '#9e1f62' }
                          }
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage * activitiesPerPage >= totalActivities}
                    className="border text-gray-700 hover:bg-gray-50"
                    style={{ borderColor: '#9e1f62' }}
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              {/* Executive Summary Integration */}
              <Card className="shadow-lg border" style={{ borderColor: '#9e1f62' }}>
                <CardHeader className="text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 50%, #8a1b58 100%)' }}>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="bg-white/20 rounded-full p-2">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    Advanced Analytics Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900">Total Employees</h4>
                      <p className="text-2xl font-bold text-blue-700 mt-1">{employees.length}</p>
                      <p className="text-sm text-blue-600">Active welfare tracking</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-900">Completion Rate</h4>
                      <p className="text-2xl font-bold text-green-700 mt-1">
                        {employees.length > 0 
                          ? Math.round((employees.filter(emp => !emp.isOverdue).length / employees.length) * 100)
                          : 0}%
                      </p>
                      <p className="text-sm text-green-600">On-time welfare activities</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-900">Activities This Month</h4>
                      <p className="text-2xl font-bold text-purple-700 mt-1">{activities.length}</p>
                      <p className="text-sm text-purple-600">Welfare activities recorded</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <h4 className="font-semibold text-orange-900">Overdue Items</h4>
                      <p className="text-2xl font-bold text-orange-700 mt-1">
                        {employees.filter(emp => emp.isOverdue).length}
                      </p>
                      <p className="text-sm text-orange-600">Require immediate attention</p>
                    </div>
                  </div>
                  
                  {/* Employee Risk Assessment */}
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Employee Risk Assessment</h4>
                    <div className="space-y-3">
                      {employees.slice(0, 5).map((employee) => {
                        const daysSinceCreated = Math.floor((Date.now() - new Date(employee.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                        const riskScore = employee.isOverdue ? 8.5 : 
                                        daysSinceCreated > 30 && employee.totalActivities === 0 ? 7.0 :
                                        employee.totalActivities === 0 ? 5.5 : 2.0;
                        const riskLevel = riskScore >= 8 ? 'Critical' : riskScore >= 6 ? 'High' : riskScore >= 4 ? 'Medium' : 'Low';
                        const riskColor = riskLevel === 'Critical' ? 'text-red-600 bg-red-50 border-red-200' :
                                        riskLevel === 'High' ? 'text-orange-600 bg-orange-50 border-orange-200' :
                                        riskLevel === 'Medium' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                                        'text-green-600 bg-green-50 border-green-200';
                        
                        return (
                          <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h5 className="font-medium">{employee.name}</h5>
                              <p className="text-sm text-gray-600">
                                {employee.isOverdue ? 'Overdue welfare check required' :
                                 employee.totalActivities === 0 ? 'No activities recorded yet' :
                                 'Regular welfare schedule'}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge className={riskColor}>
                                {riskLevel}
                              </Badge>
                              <p className="text-xs text-gray-500 mt-1">Score: {riskScore.toFixed(1)}/10</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Phase 3: Advanced Analytics</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Real-time analytics powered by optimized database queries and intelligent caching. 
                          All metrics update automatically as you record new welfare activities.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditEmployee} onOpenChange={setShowEditEmployee}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#9e1f62' }}>
              <Edit className="h-5 w-5" />
              Edit Employee
            </DialogTitle>
            <DialogDescription>
              Update the employee information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editEmployeeForm.handleSubmit(onEditEmployee)}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName" className="font-medium" style={{ color: '#9e1f62' }}>Employee Name</Label>
                <Input
                  id="editName"
                  {...editEmployeeForm.register("name")}
                  placeholder="Enter full name"
                  className="border focus:border" 
                  style={{ borderColor: '#9e1f62', '--tw-ring-color': '#9e1f62' } as any}
                />
                {editEmployeeForm.formState.errors.name && (
                  <p className="text-sm mt-1" style={{ color: '#8a1b58' }}>
                    {editEmployeeForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="editPhoneNumber" className="font-medium" style={{ color: '#9e1f62' }}>Phone Number (UK format)</Label>
                <Input
                  id="editPhoneNumber"
                  {...editEmployeeForm.register("phoneNumber")}
                  placeholder="e.g., +44 20 1234 5678 or 0207 123 4567"
                  className="border focus:border" 
                  style={{ borderColor: '#9e1f62', '--tw-ring-color': '#9e1f62' } as any}
                />
                {editEmployeeForm.formState.errors.phoneNumber && (
                  <p className="text-sm mt-1" style={{ color: '#8a1b58' }}>
                    {editEmployeeForm.formState.errors.phoneNumber.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">Optional - supports various UK formats</p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={editEmployeeForm.watch("active")}
                  onCheckedChange={(checked) => editEmployeeForm.setValue("active", checked as boolean)}
                  className="border-2"
                  style={{ borderColor: '#9e1f62' }}
                />
                <Label 
                  htmlFor="active" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  style={{ color: '#9e1f62' }}
                >
                  Active Employee
                </Label>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" className="text-white font-medium" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)' }}>
                <Edit className="h-4 w-4 mr-2" />
                Update Employee
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Dialog */}
      <AlertDialog open={showDeleteEmployee} onOpenChange={setShowDeleteEmployee}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: '#9e1f62' }}>
              <Trash2 className="h-5 w-5" />
              Delete Employee
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingEmployee?.name}</strong>? This action cannot be undone and will remove all associated welfare records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteEmployee}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Employee History Dialog */}
      <Dialog open={showEmployeeHistory} onOpenChange={setShowEmployeeHistory}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#9e1f62' }}>
              <User className="h-5 w-5" />
              {viewingEmployee?.name} - Welfare History
            </DialogTitle>
            <DialogDescription>
              Complete welfare activity history for this employee
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading welfare history...</p>
              </div>
            ) : employeeHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No welfare activities recorded for this employee yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {employeeHistory.map((activity) => (
                  <div key={activity.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className="border-purple-200 text-purple-800 bg-purple-50"
                        >
                          {activity.welfareType}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Cycle #{activity.cycleNumber}
                        </span>
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#9e1f62' }}>
                        {(() => {
                          try {
                            const date = new Date(activity.activityDate);
                            return isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'PPP');
                          } catch (error) {
                            return 'Invalid Date';
                          }
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge 
                        variant={activity.status === 'completed' ? 'default' : 'secondary'}
                        className={
                          activity.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {activity.status}
                      </Badge>
                      {activity.conductedBy && (
                        <span className="text-sm text-gray-600">
                          Conducted by: {activity.conductedBy}
                        </span>
                      )}
                    </div>
                    {activity.notes && (
                      <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                        <strong>Notes:</strong> {activity.notes}
                      </div>
                    )}
                    {activity.daysSinceLast && (
                      <div className="mt-2 text-xs text-gray-500">
                        {activity.daysSinceLast} days since previous welfare check
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          {employeeHistory.length > 0 && totalEmployeeActivities > historyPerPage && (
            <div className="flex items-center justify-between px-2 py-4 border-t">
              <div className="text-sm text-gray-500">
                Showing {((historyCurrentPage - 1) * historyPerPage) + 1} to{' '}
                {Math.min(historyCurrentPage * historyPerPage, totalEmployeeActivities)} of{' '}
                {totalEmployeeActivities} welfare records
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleHistoryPageChange(historyCurrentPage - 1)}
                  disabled={historyCurrentPage <= 1 || historyLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.ceil(totalEmployeeActivities / historyPerPage) }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === Math.ceil(totalEmployeeActivities / historyPerPage) ||
                      Math.abs(page - historyCurrentPage) <= 1
                    )
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] < page - 1 && (
                          <span className="px-2 text-gray-400">...</span>
                        )}
                        <Button
                          variant={page === historyCurrentPage ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => handleHistoryPageChange(page)}
                          disabled={historyLoading}
                        >
                          {page}
                        </Button>
                      </React.Fragment>
                    ))
                  }
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleHistoryPageChange(historyCurrentPage + 1)}
                  disabled={historyCurrentPage >= Math.ceil(totalEmployeeActivities / historyPerPage) || historyLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              onClick={() => setShowEmployeeHistory(false)}
              variant="outline"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Activity Dialog */}
      <Dialog open={showAddActivity} onOpenChange={(open) => {
        setShowAddActivity(open);
        if (!open) {
          setRecordingEmployee(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#9e1f62' }}>
              <Activity className="h-5 w-5" />
              Record Welfare Activity
              {recordingEmployee && (
                <span className="text-base font-normal text-gray-600">
                  - {recordingEmployee.name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {recordingEmployee 
                ? `Record a new welfare activity for ${recordingEmployee.name}.`
                : "Record a new welfare activity for the selected employee."
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={activityForm.handleSubmit(onCreateActivity)}>
            {recordingEmployee && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-gray-200 font-bold" style={{ color: '#9e1f62' }}>
                      {recordingEmployee.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold" style={{ color: '#9e1f62' }}>
                      {recordingEmployee.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Employee ID: {recordingEmployee.id}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <Label htmlFor="welfareType" className="font-medium" style={{ color: '#9e1f62' }}>Welfare Type</Label>
                <Select onValueChange={(value) => activityForm.setValue('welfareType', value as any)}>
                  <SelectTrigger className="border focus:border" style={{ borderColor: '#9e1f62' }}>
                    <SelectValue placeholder="Select welfare type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Welfare Call">Welfare Call</SelectItem>
                    <SelectItem value="Welfare Visit">Welfare Visit</SelectItem>
                    <SelectItem value="Dog Handler Welfare">Dog Handler Welfare</SelectItem>
                    <SelectItem value="Mental Health Check">Mental Health Check</SelectItem>
                    <SelectItem value="General Welfare">General Welfare</SelectItem>
                  </SelectContent>
                </Select>
                {activityForm.formState.errors.welfareType && (
                  <p className="text-sm mt-1" style={{ color: '#8a1b58' }}>
                    {activityForm.formState.errors.welfareType.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="activityDate" className="font-medium" style={{ color: '#9e1f62' }}>Date</Label>
                <Input
                  id="activityDate"
                  type="date"
                  {...activityForm.register("activityDate")}
                  className="border focus:border" 
                  style={{ borderColor: '#9e1f62', '--tw-ring-color': '#9e1f62' } as any}
                />
                {activityForm.formState.errors.activityDate && (
                  <p className="text-sm mt-1" style={{ color: '#8a1b58' }}>
                    {activityForm.formState.errors.activityDate.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="conductedBy" className="font-medium" style={{ color: '#9e1f62' }}>Conducted By</Label>
                <Input
                  id="conductedBy"
                  {...activityForm.register("conductedBy")}
                  placeholder="Enter name or ID"
                  className="border focus:border" 
                  style={{ borderColor: '#9e1f62', '--tw-ring-color': '#9e1f62' } as any}
                />
              </div>
              <div>
                <Label htmlFor="notes" className="font-medium" style={{ color: '#9e1f62' }}>Notes</Label>
                <Input
                  id="notes"
                  {...activityForm.register("notes")}
                  placeholder="Optional notes about the welfare activity"
                  className="border focus:border" 
                  style={{ borderColor: '#9e1f62', '--tw-ring-color': '#9e1f62' } as any}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" className="text-white font-medium" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)' }}>
                <Activity className="h-4 w-4 mr-2" />
                Record Activity
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
