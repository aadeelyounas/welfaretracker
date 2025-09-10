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

  const fetchActivities = React.useCallback(async () => {
    try {
      const response = await fetch('/api/welfare-activities');
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  }, []);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchEmployees(), fetchActivities()]);
      setLoading(false);
    };
    loadData();
  }, [fetchEmployees, fetchActivities]);

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
        fetchActivities();
      } else {
        throw new Error('Failed to create activity');
      }
    } catch (error) {
      toast({ title: "❌ Error recording activity", variant: "destructive" });
    }
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
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (dueTodayEmployees.includes(employee)) {
      return <Badge variant="outline">Due Today</Badge>;
    }
    return <Badge variant="secondary">On Track</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="mx-auto h-8 w-8 animate-spin mb-4" />
          <p>Loading welfare tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-purple-900">
              🛡️ Ashridge Welfare Tracker
            </h1>
            <p className="text-purple-600">Employee-based welfare tracking with 14-day cycles</p>
          </div>
          <LogoutButton />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmployees}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeEmployees}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Due Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{dueTodayCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{completedThisWeek}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Overdue Welfare */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Overdue Welfare ({overdueCount})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {overdueEmployees.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      🎉 No overdue welfare checks!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {overdueEmployees.slice(0, 5).map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Due: {format(employee.nextDue, 'PPP')}
                            </p>
                          </div>
                          <Badge variant="destructive">
                            {differenceInDays(new Date(), employee.nextDue)} days overdue
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Due Today */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    Due Today ({dueTodayCount})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dueTodayEmployees.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      ✨ No welfare checks due today!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {dueTodayEmployees.map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Last check: {employee.lastActivityDate ? format(employee.lastActivityDate, 'PP') : 'Never'}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              activityForm.setValue('employeeId', employee.id);
                              setShowAddActivity(true);
                            }}
                          >
                            Record Check
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Employee Welfare Tracking</CardTitle>
                  <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Employee
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Employee</DialogTitle>
                        <DialogDescription>
                          Add a new employee to the welfare tracking system.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={employeeForm.handleSubmit(onCreateEmployee)}>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name">Employee Name</Label>
                            <Input
                              id="name"
                              {...employeeForm.register("name")}
                              placeholder="Enter full name"
                            />
                            {employeeForm.formState.errors.name && (
                              <p className="text-sm text-red-500">
                                {employeeForm.formState.errors.name.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <DialogFooter className="mt-6">
                          <Button type="submit">Add Employee</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Total Activities</TableHead>
                      <TableHead>Last Check</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`https://picsum.photos/100/100?${employee.id}`} />
                              <AvatarFallback>
                                {employee.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{employee.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(employee)}</TableCell>
                        <TableCell>{format(employee.nextDue, 'PPP')}</TableCell>
                        <TableCell>{employee.totalActivities}</TableCell>
                        <TableCell>
                          {employee.lastActivityDate 
                            ? format(employee.lastActivityDate, 'PP')
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              activityForm.setValue('employeeId', employee.id);
                              setShowAddActivity(true);
                            }}
                          >
                            <Activity className="h-4 w-4 mr-2" />
                            Record
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
                  <Dialog open={showAddActivity} onOpenChange={setShowAddActivity}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Record Activity
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Record Welfare Activity</DialogTitle>
                        <DialogDescription>
                          Record a new welfare check or activity.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={activityForm.handleSubmit(onCreateActivity)}>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="employeeId">Employee</Label>
                            <Select 
                              value={activityForm.watch("employeeId")} 
                              onValueChange={(value) => activityForm.setValue("employeeId", value)}
                            >
                              <SelectTrigger>
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
                            <Label htmlFor="welfareType">Welfare Type</Label>
                            <Select 
                              value={activityForm.watch("welfareType")} 
                              onValueChange={(value) => activityForm.setValue("welfareType", value as any)}
                            >
                              <SelectTrigger>
                                <SelectValue />
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
                            <Label htmlFor="activityDate">Date</Label>
                            <Input
                              id="activityDate"
                              type="date"
                              {...activityForm.register("activityDate")}
                            />
                          </div>

                          <div>
                            <Label htmlFor="conductedBy">Conducted By</Label>
                            <Input
                              id="conductedBy"
                              {...activityForm.register("conductedBy")}
                              placeholder="Your name"
                            />
                          </div>

                          <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                              id="notes"
                              {...activityForm.register("notes")}
                              placeholder="Activity notes and observations..."
                              rows={3}
                            />
                          </div>
                        </div>
                        <DialogFooter className="mt-6">
                          <Button type="submit">Record Activity</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
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
                    {activities.slice(0, 20).map((activity) => (
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
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
