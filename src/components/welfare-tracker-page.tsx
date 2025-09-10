
"use client";

import * as React from "react";
import { addDays, differenceInDays, format, startOfToday } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  MoreHorizontal,
  PlusCircle,
  Search,
  Settings,
  Upload,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { WelfareEvent, StatusVariant } from "@/lib/types";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { LogoutButton } from "@/components/logout-button";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        accent: "border-transparent bg-accent text-accent-foreground",
        warning: "border-transparent bg-yellow-500 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const eventFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  eventType: z.enum(['Welfare Call', 'Welfare Visit', 'Dog Handler Welfare']),
  welfareDate: z.date({ required_error: "A welfare date is required." }),
  notes: z.string().optional(),
  followUpCompleted: z.boolean().default(false),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function WelfareTrackerPage() {
  const { toast } = useToast();
  const [events, setEvents] = React.useState<WelfareEvent[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilters, setStatusFilters] = React.useState<Set<string>>(new Set());
  const [isSheetOpen, setSheetOpen] = React.useState(false);
  const [isAlertOpen, setAlertOpen] = React.useState(false);
  const [eventToEdit, setEventToEdit] = React.useState<WelfareEvent | null>(null);
  const [eventToDelete, setEventToDelete] = React.useState<string | null>(null);
  const [followUpInterval, setFollowUpInterval] = React.useState(14);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [historyEmployee, setHistoryEmployee] = React.useState<WelfareEvent | null>(null);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      followUpCompleted: false,
      notes: ""
    }
  });

  const fetchEvents = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/welfare-events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data.map((e: any) => ({...e, welfareDate: new Date(e.welfareDate)})));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch welfare events.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getEventStatus = React.useCallback((event: WelfareEvent, interval: number) => {
    if (event.followUpCompleted) {
      return { text: "Follow-up completed", variant: "default" as StatusVariant, icon: CheckCircle2 };
    }
    const today = startOfToday();
    const dueDate = addDays(event.welfareDate, interval);
    const daysOverdue = differenceInDays(today, dueDate);

    if (daysOverdue > 14) {
      return { text: `Overdue by ${daysOverdue} days`, variant: "destructive" as StatusVariant, icon: AlertTriangle };
    }
    if (daysOverdue > 0) {
      return { text: `Overdue by ${daysOverdue} days`, variant: "accent" as StatusVariant, icon: AlertCircle };
    }
    if (daysOverdue === 0) {
      return { text: "Due today", variant: "accent" as StatusVariant, icon: Clock };
    }
    return { text: `Due in ${-daysOverdue} days`, variant: "secondary" as StatusVariant, icon: Clock };
  }, []);

  const allStatuses = ["High-Priority Overdue", "Overdue", "Due today", "Upcoming", "Completed"];
  const statusMapping: { [key: string]: (status: ReturnType<typeof getEventStatus>) => boolean } = {
    "High-Priority Overdue": (s) => s.variant === "destructive",
    "Overdue": (s) => s.variant === "accent" && s.text.includes("Overdue"),
    "Due today": (s) => s.text === "Due today",
    "Upcoming": (s) => s.variant === "secondary",
    "Completed": (s) => s.variant === "default",
  };

  const filteredEvents = React.useMemo(() => {
    return events
      .map(event => ({ event, status: getEventStatus(event, followUpInterval) }))
      .filter(({ event, status }) => {
        const searchMatch =
          event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (event.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.eventType.toLowerCase().includes(searchTerm.toLowerCase());

        const statusMatch = statusFilters.size === 0 || Array.from(statusFilters).some(filter => statusMapping[filter]?.(status));
        
        return searchMatch && statusMatch;
      })
      .sort((a, b) => a.event.followUpCompleted === b.event.followUpCompleted ? b.event.welfareDate.getTime() - a.event.welfareDate.getTime() : a.event.followUpCompleted ? 1 : -1);
  }, [events, searchTerm, statusFilters, getEventStatus, followUpInterval]);
  
  const handleToggleFollowUp = async (id: string) => {
    const originalEvents = [...events];
    const eventToToggle = events.find(e => e.id === id);
    if (!eventToToggle) return;

    // Optimistically update UI
    const updatedEvents = events.map(e => e.id === id ? { ...e, followUpCompleted: !e.followUpCompleted } : e);
    if (!eventToToggle.followUpCompleted) {
        // Add a placeholder for the new event
        const placeholderNewEvent: WelfareEvent = {
            id: 'new-placeholder',
            name: eventToToggle.name,
            eventType: eventToToggle.eventType,
            welfareDate: addDays(new Date(), followUpInterval),
            followUpCompleted: false,
            notes: 'Scheduling next follow-up...',
            avatarUrl: eventToToggle.avatarUrl
        };
        updatedEvents.push(placeholderNewEvent);
    }
    setEvents(updatedEvents);

    try {
        const response = await fetch(`/api/welfare-events/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggleFollowUp', followUpInterval }),
        });
        if (!response.ok) throw new Error('Failed to toggle follow-up');
        await fetchEvents(); // Re-fetch to get the final state from the server
        toast({ title: 'Success', description: `Follow-up status for ${eventToToggle.name} updated.` });
    } catch (error) {
        setEvents(originalEvents); // Revert on error
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update follow-up status.' });
    }
};

  const handleOpenSheet = (event: WelfareEvent | null) => {
    setEventToEdit(event);
    if (event) {
      form.reset({
        name: event.name,
        eventType: event.eventType,
        welfareDate: event.welfareDate,
        followUpCompleted: event.followUpCompleted,
        notes: event.notes,
      });
    } else {
      form.reset({
        name: "",
        eventType: undefined,
        welfareDate: new Date(),
        followUpCompleted: false,
        notes: "",
      });
    }
    setSheetOpen(true);
  };
  
 const onSubmit = async (data: EventFormValues) => {
    const method = eventToEdit ? 'PUT' : 'POST';
    const url = eventToEdit ? `/api/welfare-events/${eventToEdit.id}` : '/api/welfare-events';
    const originalEvents = [...events];

    try {
      // Optimistic UI update
      if (eventToEdit) {
        setEvents(events.map(e => e.id === eventToEdit.id ? { ...eventToEdit, ...data } : e));
      } else {
        const optimisticNewEvent: WelfareEvent = {
          id: `temp-${Date.now()}`,
          avatarUrl: `https://picsum.photos/100/100?${Date.now()}`,
          ...data,
        };
        setEvents([optimisticNewEvent, ...events]);
      }
      setSheetOpen(false);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save event');
      
      await fetchEvents(); // Re-sync with server state
      
      toast({
        title: `Event ${eventToEdit ? 'Updated' : 'Created'}`,
        description: `Welfare event for ${data.name} has been saved.`,
      });

    } catch (error) {
      setEvents(originalEvents); // Revert on error
      toast({
        variant: "destructive",
        title: "Error saving event",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
      setSheetOpen(true); // Re-open sheet if there was an error
    } finally {
      setEventToEdit(null);
    }
  };


  const handleDelete = (id: string) => {
    setEventToDelete(id);
    setAlertOpen(true);
  };

 const confirmDelete = async () => {
    if (!eventToDelete) return;
    
    const originalEvents = [...events];
    setEvents(events.filter((e) => e.id !== eventToDelete)); // Optimistic delete
    
    try {
        const response = await fetch(`/api/welfare-events/${eventToDelete}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete event');
        toast({ title: 'Event Deleted', description: 'The welfare event has been removed.' });
    } catch (error) {
        setEvents(originalEvents); // Revert on error
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the event.' });
    } finally {
        setAlertOpen(false);
        setEventToDelete(null);
    }
};

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Event Type', 'Welfare Date', 'Due Date', 'Status', 'Follow-up Completed', 'Notes'];
    const rows = filteredEvents.map(({event, status}) => [
      `"${event.id}"`,
      `"${event.name}"`,
      `"${event.eventType}"`,
      `"${format(event.welfareDate, 'yyyy-MM-dd')}"`,
      `"${format(addDays(event.welfareDate, followUpInterval), 'yyyy-MM-dd')}"`,
      `"${status.text}"`,
      event.followUpCompleted,
      `"${(event.notes || '').replace(/"/g, '""')}"`
    ].join(','));
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "welfare_data_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const exportToJSON = async () => {
    try {
      const response = await fetch('/api/welfare-events?format=raw');
      if (!response.ok) throw new Error('Failed to fetch raw data');
      const data = await response.json();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const link = document.createElement('a');
      link.href = jsonString;
      link.download = 'welfare-events-backup.json';
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Export Error', description: 'Could not export JSON data.' });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result;
        if (typeof content !== 'string') {
          throw new Error('File could not be read.');
        }
        const jsonData = JSON.parse(content);
        const response = await fetch('/api/welfare-events?action=import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jsonData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to import data.');
        }

        toast({ title: 'Import Successful', description: 'Welfare data has been imported.' });
        await fetchEvents();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Import Error', description: error instanceof Error ? error.message : 'Invalid JSON file.' });
      } finally {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleStatusFilterChange = (status: string, checked: boolean) => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(status);
      } else {
        next.delete(status);
      }
      return next;
    });
  };

  const handleShowHistory = (event: WelfareEvent) => {
    setHistoryEmployee(event);
  };

  const employeeHistory = React.useMemo(() => {
    if (!historyEmployee) return [];
    return events
        .filter(e => e.name === historyEmployee.name)
        .sort((a, b) => new Date(b.welfareDate).getTime() - new Date(a.welfareDate).getTime());
  }, [events, historyEmployee]);


  return (
    <>
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-b">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <img 
                  src="https://ashridge-group-com.nimbus-cdn.uk/wp-content/uploads/2018/10/logo-ash-grp.png"
                  alt="Ashridge Group"
                  className="h-14 w-auto brightness-0 invert"
                  onError={(e) => {
                    // Fallback to local logo if CDN fails
                    e.currentTarget.src = '/ashridge-logo.png';
                    e.currentTarget.onerror = () => {
                      // If local logo also fails, hide the image
                      e.currentTarget.style.display = 'none';
                    };
                  }}
                />
              </div>
              <div>
                <CardTitle className="text-2xl font-headline text-white">
                  <span className="font-bold">Ashridge Group</span>
                  <span className="block text-lg font-normal text-purple-100 mt-1">
                    Employee Welfare Tracker
                  </span>
                </CardTitle>
                <CardDescription className="mt-2 text-purple-100">
                  Comprehensive welfare monitoring and management system
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
               <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="w-full sm:w-auto bg-white/20 hover:bg-white/30 border-white/30 text-white">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Configure the tracker's behavior.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="follow-up-interval">Follow-up Interval (Days)</Label>
                      <Input
                        id="follow-up-interval"
                        type="number"
                        min="1"
                        value={followUpInterval}
                        onChange={(e) => setFollowUpInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="w-full sm:w-auto bg-white/20 hover:bg-white/30 border-white/30 text-white">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportToCSV}>Export to CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToJSON}>Export to JSON</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
               <Button variant="secondary" size="sm" onClick={handleImportClick} className="w-full sm:w-auto bg-white/20 hover:bg-white/30 border-white/30 text-white">
                 <Upload className="mr-2 h-4 w-4" />
                 Import JSON
               </Button>
               <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                className="hidden"
                accept="application/json"
              />
              <Button size="sm" onClick={() => handleOpenSheet(null)} className="w-full sm:w-auto bg-white text-purple-600 hover:bg-white/90">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Event
              </Button>
              <LogoutButton />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, notes, type..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="shrink-0">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allStatuses.map(status => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilters.has(status)}
                    onCheckedChange={(checked) => handleStatusFilterChange(status, !!checked)}
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50">
                <TableRow>
                  <TableHead className="w-[250px]">Name</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Welfare Date</TableHead>
                  <TableHead>Follow-up Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-32 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredEvents.length > 0 ? (
                  filteredEvents.map(({event, status}) => {
                    const { text: statusText, variant: statusVariant, icon: StatusIcon } = status;
                    const dueDate = addDays(event.welfareDate, followUpInterval);
                    return (
                      <TableRow key={event.id} className={cn("group", event.followUpCompleted && "bg-muted/30 opacity-60")}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={event.avatarUrl} alt={event.name} data-ai-hint="person portrait" />
                              <AvatarFallback>{event.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <Button variant="link" className="p-0 h-auto" onClick={() => handleShowHistory(event)}>
                              <span className="font-medium">{event.name}</span>
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{event.eventType}</TableCell>
                        <TableCell>{format(event.welfareDate, "dd MMM yyyy")}</TableCell>
                        <TableCell>{format(dueDate, "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant as any} className={cn(badgeVariants({ variant: statusVariant }))}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusText}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenSheet(event)} disabled={event.followUpCompleted}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleFollowUp(event.id)}>
                                {event.followUpCompleted ? "Re-open Follow-up" : "Mark as Complete"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(event.id)}>
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No results found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter>
            <div className="text-xs text-muted-foreground">
                Showing <strong>{filteredEvents.length}</strong> of <strong>{events.length}</strong> events.
            </div>
        </CardFooter>
      </Card>
      
      <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{eventToEdit ? 'Edit Welfare Event' : 'Add New Welfare Event'}</SheetTitle>
            <SheetDescription>
              {eventToEdit ? 'Update the details for this welfare event.' : 'Log a new welfare-related event here.'}
            </SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Person's Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Welfare Call">Welfare Call</SelectItem>
                          <SelectItem value="Welfare Visit">Welfare Visit</SelectItem>
                          <SelectItem value="Dog Handler Welfare">Dog Handler Welfare</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="welfareDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Welfare Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any relevant details or notes..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="followUpCompleted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Follow-up Completed
                      </FormLabel>
                      <FormDescription>
                        Check this box if the required follow-up action has been taken.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                 <SheetClose asChild>
                   <Button type="button" variant="secondary">Cancel</Button>
                 </SheetClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : eventToEdit ? 'Save Changes' : 'Create Event'}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the welfare event record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={!!historyEmployee} onOpenChange={(isOpen) => !isOpen && setHistoryEmployee(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Welfare History for {historyEmployee?.name}</DialogTitle>
            <DialogDescription>
              Showing all past welfare events for this employee.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-4">
            <div className="space-y-6">
              {employeeHistory.length > 0 ? employeeHistory.map(event => (
                <div key={event.id} className="flex items-start gap-4">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={event.avatarUrl} alt={event.name} />
                    <AvatarFallback>{event.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{event.eventType}</p>
                      <time className="text-xs text-muted-foreground">{format(event.welfareDate, "dd MMM yyyy")}</time>
                    </div>
                     <p className="text-sm text-muted-foreground">{event.notes}</p>
                     {event.followUpCompleted ? (
                        <Badge variant="default" className="mt-2">Completed</Badge>
                     ) : (
                        <Badge variant="accent" className="mt-2">Pending</Badge>
                     )}
                  </div>
                </div>
              )) : (
                <p className="text-center text-muted-foreground py-8">No history found for this employee.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

