"use client";

import * as React from "react";
import { addDays, differenceInDays, format, startOfToday } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  User,
  Calendar,
  Activity,
  Bell,
  Edit,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { LogoutButton } from "@/components/logout-button";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Types for the new system
interface Employee {
  id: string;
  name: string;
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

const createEmployeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const createWelfareActivitySchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  welfareType: z.enum(['Welfare Call', 'Welfare Visit', 'Dog Handler Welfare', 'Mental Health Check', 'General Welfare']),
  activityDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  conductedBy: z.string().optional(),
});

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
  const [editingEmployee, setEditingEmployee] = React.useState<EmployeeWithWelfare | null>(null);
  const [deletingEmployee, setDeletingEmployee] = React.useState<EmployeeWithWelfare | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalActivities, setTotalActivities] = React.useState(0);
  const activitiesPerPage = 10;
  
  const { toast } = useToast();

  // Forms
  const employeeForm = useForm<z.infer<typeof createEmployeeSchema>>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: { name: "" },
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

  const editEmployeeForm = useForm<z.infer<typeof createEmployeeSchema>>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: { name: "" },
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
      const response = await fetch('/api/welfare-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          activityDate: new Date(values.activityDate),
        }),
      });

      if (response.ok) {
        toast({ title: "✅ Welfare activity recorded successfully!" });
        activityForm.reset();
        setShowAddActivity(false);
        fetchEmployees();
        fetchActivities(currentPage);
      } else {
        throw new Error('Failed to create activity');
      }
    } catch (error) {
      toast({ title: "❌ Error recording activity", variant: "destructive" });
    }
  };

  // Edit employee
  const onEditEmployee = async (values: z.infer<typeof createEmployeeSchema>) => {
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
    setShowEditEmployee(true);
  };

  // Handle delete button click
  const handleDeleteEmployee = (employee: EmployeeWithWelfare) => {
    setDeletingEmployee(employee);
    setShowDeleteEmployee(true);
  };

  // Handle record activity button click
  const handleRecordActivity = (employee: EmployeeWithWelfare) => {
    activityForm.setValue('employeeId', employee.id);
    setShowAddActivity(true);
  };

  // Filter data
  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const overdueEmployees = employees.filter(emp => emp.isOverdue);
  const dueTodayEmployees = employees.filter(emp => {
    const today = startOfToday();
    const dueDate = new Date(emp.nextDue);
    return format(dueDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-25 to-slate-50 p-4">
      <div className="mx-auto max-w-7xl">
        {/* Enhanced Branded Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-[#9e1f62] via-[#b02470] to-[#8a1b58] rounded-2xl p-8 text-white shadow-2xl" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 50%, #8a1b58 100%)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div>
                  <img 
                    src="/ashridge-logo.png" 
                    alt="Ashridge Group Logo" 
                    className="h-16 w-auto object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-2 drop-shadow-md">
                    Welfare Tracker
                  </h1>
                  <p className="text-pink-100 text-lg drop-shadow-sm">
                    Comprehensive employee welfare monitoring system
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2 text-pink-200">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">14-day monitoring cycles</span>
                    </div>
                    <div className="flex items-center gap-2 text-pink-200">
                      <User className="h-4 w-4" />
                      <span className="text-sm">{totalEmployees} employees tracked</span>
                    </div>
                    <div className="flex items-center gap-2 text-pink-200">
                      <Activity className="h-4 w-4" />
                      <span className="text-sm">{activities.length} welfare activities</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <LogoutButton />
                <div className="mt-4 text-right">
                  <p className="text-pink-200 text-sm">Last updated</p>
                  <p className="text-white font-medium">{format(new Date(), 'PPP')}</p>
                </div>
              </div>
            </div>
            
            {/* Alert Banner for Critical Items */}
            {(overdueCount > 0 || dueTodayCount > 0) && (
              <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-white animate-pulse" />
                  <div>
                    <p className="font-semibold text-white">Attention Required</p>
                    <p className="text-white/80 text-sm">
                      {overdueCount > 0 && `${overdueCount} overdue welfare check${overdueCount > 1 ? 's' : ''}`}
                      {overdueCount > 0 && dueTodayCount > 0 && ' • '}
                      {dueTodayCount > 0 && `${dueTodayCount} due today`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Stats Cards with Branding */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-all border-2" style={{ 
            background: 'linear-gradient(135deg, rgba(158, 31, 98, 0.05) 0%, rgba(176, 36, 112, 0.1) 100%)',
            borderColor: '#9e1f62'
          }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: '#9e1f62' }}>
                <User className="h-4 w-4" />
                Total Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#8a1b58' }}>{totalEmployees}</div>
              <p className="text-xs mt-1" style={{ color: '#9e1f62' }}>Active workforce</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-all border-2" style={{ 
            background: 'linear-gradient(135deg, rgba(158, 31, 98, 0.05) 0%, rgba(176, 36, 112, 0.1) 100%)',
            borderColor: '#9e1f62'
          }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: '#9e1f62' }}>
                <CheckCircle2 className="h-4 w-4" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#8a1b58' }}>{activeEmployees}</div>
              <p className="text-xs mt-1" style={{ color: '#9e1f62' }}>In system</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all border-2" style={{ 
            background: 'linear-gradient(135deg, rgba(158, 31, 98, 0.05) 0%, rgba(176, 36, 112, 0.1) 100%)',
            borderColor: '#9e1f62'
          }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: '#9e1f62' }}>
                <AlertTriangle className="h-4 w-4" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#8a1b58' }}>{overdueCount}</div>
              <p className="text-xs mt-1" style={{ color: '#9e1f62' }}>Need attention</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all border-2" style={{ 
            background: 'linear-gradient(135deg, rgba(158, 31, 98, 0.05) 0%, rgba(176, 36, 112, 0.1) 100%)',
            borderColor: '#9e1f62'
          }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: '#9e1f62' }}>
                <Clock className="h-4 w-4" />
                Due Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#8a1b58' }}>{dueTodayCount}</div>
              <p className="text-xs mt-1" style={{ color: '#9e1f62' }}>Scheduled today</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all border-2" style={{ 
            background: 'linear-gradient(135deg, rgba(158, 31, 98, 0.05) 0%, rgba(176, 36, 112, 0.1) 100%)',
            borderColor: '#9e1f62'
          }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: '#9e1f62' }}>
                <Activity className="h-4 w-4" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#8a1b58' }}>{completedThisWeek}</div>
              <p className="text-xs mt-1" style={{ color: '#9e1f62' }}>Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Enhanced Styling */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="bg-white rounded-xl shadow-lg p-2 border-2" style={{ borderColor: '#9e1f62' }}>
            <TabsTrigger 
              value="dashboard" 
              className={cn(
                "rounded-lg px-6 py-3 font-semibold transition-all duration-300 flex items-center gap-2",
                selectedTab === "dashboard" 
                  ? "text-white shadow-lg transform scale-105" 
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              )}
              style={selectedTab === "dashboard" ? { 
                background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)',
                boxShadow: '0 4px 12px rgba(158, 31, 98, 0.3)',
                color: 'white'
              } : {}}
            >
              <Activity className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="employees"
              className={cn(
                "rounded-lg px-6 py-3 font-semibold transition-all duration-300 flex items-center gap-2",
                selectedTab === "employees" 
                  ? "text-white shadow-lg transform scale-105" 
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              )}
              style={selectedTab === "employees" ? { 
                background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)',
                boxShadow: '0 4px 12px rgba(158, 31, 98, 0.3)',
                color: 'white'
              } : {}}
            >
              <User className="h-4 w-4" />
              Employees
            </TabsTrigger>
            <TabsTrigger 
              value="activities"
              className={cn(
                "rounded-lg px-6 py-3 font-semibold transition-all duration-300 flex items-center gap-2",
                selectedTab === "activities" 
                  ? "text-white shadow-lg transform scale-105" 
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              )}
              style={selectedTab === "activities" ? { 
                background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)',
                boxShadow: '0 4px 12px rgba(158, 31, 98, 0.3)',
                color: 'white'
              } : {}}
            >
              <Calendar className="h-4 w-4" />
              Activities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Enhanced Overdue Welfare Card - Critical Priority with Dark Brand Colors */}
              <Card className="shadow-lg border-2" style={{ 
                background: 'linear-gradient(135deg, rgba(138, 27, 88, 0.1) 0%, rgba(158, 31, 98, 0.15) 100%)',
                borderColor: '#8a1b58'
              }}>
                <CardHeader className="text-white rounded-t-lg" style={{ 
                  background: 'linear-gradient(135deg, #8a1b58 0%, #6d1545 100%)' 
                }}>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="bg-white/20 rounded-full p-2">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    Overdue Welfare Checks
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      {overdueCount}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {overdueEmployees.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">🎉</div>
                      <p className="font-medium" style={{ color: '#9e1f62' }}>No overdue welfare checks!</p>
                      <p className="text-sm mt-1" style={{ color: '#b02470' }}>All employees are up to date</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {overdueEmployees.slice(0, 5).map((employee) => (
                        <div key={employee.id} className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border-2" style={{ borderColor: '#8a1b58' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2" style={{ borderColor: '#8a1b58' }}>
                                <AvatarImage src={`https://picsum.photos/100/100?${employee.id}`} />
                                <AvatarFallback className="text-white" style={{ backgroundColor: '#8a1b58' }}>
                                  {employee.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-gray-900">{employee.name}</p>
                                <p className="text-sm" style={{ color: '#8a1b58' }}>
                                  Due: {format(employee.nextDue, 'PPP')}
                                </p>
                              </div>
                            </div>
                            <Badge className="font-medium text-white" style={{ backgroundColor: '#8a1b58' }}>
                              {differenceInDays(new Date(), employee.nextDue)} days overdue
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {overdueEmployees.length > 5 && (
                        <div className="text-center pt-2">
                          <Button variant="outline" size="sm" style={{ borderColor: '#8a1b58', color: '#8a1b58' }}>
                            View {overdueEmployees.length - 5} more overdue
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Enhanced Due Today Card - Warning Level with Medium Brand Colors */}
              <Card className="shadow-lg border-2" style={{ 
                background: 'linear-gradient(135deg, rgba(158, 31, 98, 0.05) 0%, rgba(176, 36, 112, 0.1) 100%)',
                borderColor: '#b02470'
              }}>
                <CardHeader className="text-white rounded-t-lg" style={{ 
                  background: 'linear-gradient(135deg, #b02470 0%, #9e1f62 100%)' 
                }}>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="bg-white/20 rounded-full p-2">
                      <Clock className="h-5 w-5" />
                    </div>
                    Due Today
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      {dueTodayCount}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {dueTodayEmployees.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">✨</div>
                      <p className="font-medium" style={{ color: '#9e1f62' }}>No welfare checks due today!</p>
                      <p className="text-sm mt-1" style={{ color: '#b02470' }}>Your schedule is clear</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dueTodayEmployees.map((employee) => (
                        <div key={employee.id} className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border-2" style={{ borderColor: '#b02470' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2" style={{ borderColor: '#b02470' }}>
                                <AvatarImage src={`https://picsum.photos/100/100?${employee.id}`} />
                                <AvatarFallback className="text-white" style={{ backgroundColor: '#b02470' }}>
                                  {employee.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-gray-900">{employee.name}</p>
                                <p className="text-sm" style={{ color: '#b02470' }}>
                                  Last check: {employee.lastActivityDate ? format(employee.lastActivityDate, 'PP') : 'Never'}
                                </p>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              className="text-white font-medium shadow-md hover:shadow-lg transition-all"
                              style={{
                                background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)'
                              }}
                              onClick={() => {
                                activityForm.setValue('employeeId', employee.id);
                                setShowAddActivity(true);
                              }}
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

          <TabsContent value="employees" className="space-y-6">
            <Card className="shadow-lg border" style={{ borderColor: '#9e1f62' }}>
              <CardHeader className="text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 50%, #8a1b58 100%)' }}>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="bg-white/20 rounded-full p-2">
                      <User className="h-5 w-5" />
                    </div>
                    Employee Welfare Tracking
                  </CardTitle>
                  <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
                    <DialogTrigger asChild>
                      <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 font-medium">
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
                <div className="flex items-center gap-4 mt-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                    <Input
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/20 border-white/30 placeholder:text-white/70 text-white"
                    />
                  </div>
                  <div className="text-white/80 text-sm">
                    {filteredEmployees.length} of {totalEmployees} employees
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-pink-50 border" style={{ borderColor: '#9e1f62' }}>
                      <TableHead className="font-semibold" style={{ color: '#9e1f62' }}>Employee</TableHead>
                      <TableHead className="font-semibold" style={{ color: '#9e1f62' }}>Status</TableHead>
                      <TableHead className="font-semibold" style={{ color: '#9e1f62' }}>Next Due</TableHead>
                      <TableHead className="font-semibold" style={{ color: '#9e1f62' }}>Total Activities</TableHead>
                      <TableHead className="font-semibold" style={{ color: '#9e1f62' }}>Last Check</TableHead>
                      <TableHead className="font-semibold" style={{ color: '#9e1f62' }}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="text-gray-500">
                            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">No employees found</p>
                            <p className="text-sm">
                              {searchTerm ? 'Try adjusting your search terms' : 'Add your first employee to get started'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map((employee, index) => (
                        <TableRow 
                          key={employee.id} 
                          className={cn(
                            "transition-colors hover:bg-opacity-5",
                            employee.isOverdue && "bg-red-50/30",
                            dueTodayEmployees.includes(employee) && "bg-amber-50/30",
                            index % 2 === 0 && "bg-gray-50/30"
                          )}
                          style={{
                            '--tw-bg-opacity': '0.05'
                          } as any}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(158, 31, 98, 0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '';
                          }}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2" style={{ borderColor: '#9e1f62' }}>
                                <AvatarImage src={`https://picsum.photos/100/100?${employee.id}`} />
                                <AvatarFallback className="text-white font-medium" style={{ backgroundColor: '#9e1f62' }}>
                                  {employee.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-semibold text-gray-900">{employee.name}</span>
                                {employee.totalActivities > 0 && (
                                  <div className="text-xs mt-1" style={{ color: '#9e1f62' }}>
                                    {employee.totalActivities} welfare activities
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(employee)}</TableCell>
                          <TableCell>
                            <div className="font-medium text-gray-900">
                              {format(employee.nextDue, 'PP')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(employee.nextDue, 'EEEE')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-medium">
                                {employee.totalActivities}
                              </Badge>
                              {employee.totalActivities > 0 && (
                                <span className="text-xs text-green-600">tracked</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {employee.lastActivityDate ? (
                              <div>
                                <div className="font-medium text-gray-900">
                                  {format(employee.lastActivityDate, 'PP')}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {employee.daysSinceLastWelfare !== undefined && 
                                    `${employee.daysSinceLastWelfare} days ago`
                                  }
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Never</span>
                            )}
                          </TableCell>
                          <TableCell>
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
                                <DropdownMenuItem 
                                  onClick={() => handleRecordActivity(employee)}
                                  className="cursor-pointer"
                                >
                                  <Activity className="h-4 w-4 mr-2" />
                                  Record Activity
                                </DropdownMenuItem>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Welfare Activities</CardTitle>
                  <Button onClick={() => setShowAddActivity(true)} className="text-white font-medium" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)' }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Activity
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
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
                        <TableCell>{format(new Date(activity.activityDate), 'PP')}</TableCell>
                        <TableCell>#{activity.cycleNumber}</TableCell>
                        <TableCell>{activity.conductedBy || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {activity.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>

              {/* Pagination Controls */}
              <CardFooter className="flex items-center justify-between p-6">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * activitiesPerPage) + 1} to {Math.min(currentPage * activitiesPerPage, totalActivities)} of {totalActivities} activities
                </div>
                <div className="flex items-center gap-2">
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
                    {Array.from({ length: Math.min(5, Math.ceil(totalActivities / activitiesPerPage)) }, (_, i) => {
                      const totalPages = Math.ceil(totalActivities / activitiesPerPage);
                      let pageNum;
                      
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
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
                    disabled={currentPage >= Math.ceil(totalActivities / activitiesPerPage)}
                    className="border text-gray-700 hover:bg-gray-50"
                    style={{ borderColor: '#9e1f62' }}
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditEmployee} onOpenChange={setShowEditEmployee}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editEmployeeForm.handleSubmit(onEditEmployee)}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="font-medium" style={{ color: '#9e1f62' }}>Employee Name</Label>
                <Input
                  id="name"
                  {...editEmployeeForm.register("name")}
                  placeholder="Enter employee full name"
                  className="border focus:border" 
                  style={{ borderColor: '#9e1f62', '--tw-ring-color': '#9e1f62' } as any}
                />
                {editEmployeeForm.formState.errors.name && (
                  <p className="text-sm mt-1" style={{ color: '#8a1b58' }}>
                    {editEmployeeForm.formState.errors.name.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditEmployee(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="text-white font-medium" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)' }}>
                <Edit className="h-4 w-4 mr-2" />
                Update Employee
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Activity Dialog */}
      <Dialog open={showAddActivity} onOpenChange={setShowAddActivity}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#9e1f62' }}>
              <Activity className="h-5 w-5" />
              Record Welfare Activity
            </DialogTitle>
            <DialogDescription>
              Record a new welfare check or activity for the selected employee.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={activityForm.handleSubmit(onCreateActivity)}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="employeeId" className="font-medium" style={{ color: '#9e1f62' }}>Employee</Label>
                <Select 
                  value={activityForm.watch("employeeId")} 
                  onValueChange={(value) => activityForm.setValue("employeeId", value)}
                >
                  <SelectTrigger className="border focus:border" style={{ borderColor: '#9e1f62', '--tw-ring-color': '#9e1f62' } as any}>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="welfareType" className="font-medium" style={{ color: '#9e1f62' }}>Welfare Type</Label>
                <Select 
                  value={activityForm.watch("welfareType")} 
                  onValueChange={(value) => activityForm.setValue("welfareType", value as any)}
                >
                  <SelectTrigger className="border focus:border" style={{ borderColor: '#9e1f62', '--tw-ring-color': '#9e1f62' } as any}>
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
              </div>

              <div>
                <Label htmlFor="conductedBy" className="font-medium" style={{ color: '#9e1f62' }}>Conducted By</Label>
                <Input
                  id="conductedBy"
                  {...activityForm.register("conductedBy")}
                  placeholder="Your name"
                  className="border focus:border" 
                  style={{ borderColor: '#9e1f62', '--tw-ring-color': '#9e1f62' } as any}
                />
              </div>

              <div>
                <Label htmlFor="notes" className="font-medium" style={{ color: '#9e1f62' }}>Notes</Label>
                <Textarea
                  id="notes"
                  {...activityForm.register("notes")}
                  placeholder="Activity notes and observations..."
                  rows={3}
                  className="border focus:border" 
                  style={{ borderColor: '#9e1f62', '--tw-ring-color': '#9e1f62' } as any}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAddActivity(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="text-white font-medium" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)' }}>
                <Activity className="h-4 w-4 mr-2" />
                Record Activity
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Dialog */}
      <AlertDialog open={showDeleteEmployee} onOpenChange={setShowDeleteEmployee}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingEmployee?.name}</strong>? This action cannot be undone and will also remove all associated welfare activities.
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
    </div>
  );
}
