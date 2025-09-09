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
  X,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { WelfareEvent, StatusVariant } from "@/lib/types";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

// --- MOCK DATA & SETTINGS ---
const DUE_DAYS_CONFIG = 7; // Configurable setting for due days

const initialEvents: WelfareEvent[] = [
  { id: "EVT001", name: "John Doe", avatarUrl: "https://picsum.photos/100/100?a", welfareDate: new Date(new Date().setDate(new Date().getDate() - 20)), followUpCompleted: false, notes: "Discussed recent project stress.", eventType: 'Check-in' },
  { id: "EVT002", name: "Jane Smith", avatarUrl: "https://picsum.photos/100/100?b", welfareDate: new Date(new Date().setDate(new Date().getDate() - 8)), followUpCompleted: false, notes: "Follow up on previous incident report.", eventType: 'Incident' },
  { id: "EVT003", name: "Sam Wilson", avatarUrl: "https://picsum.photos/100/100?c", welfareDate: new Date(new Date().setDate(new Date().getDate() - 5)), followUpCompleted: true, notes: "Completed.", eventType: 'Support Request' },
  { id: "EVT004", name: "Emily Brown", avatarUrl: "https://picsum.photos/100/100?d", welfareDate: addDays(new Date(), -DUE_DAYS_CONFIG), followUpCompleted: false, notes: "Regular check-in scheduled.", eventType: 'Meeting' },
  { id: "EVT005", name: "Michael Lee", avatarUrl: "https://picsum.photos/100/100?e", welfareDate: new Date(new Date().setDate(new Date().getDate() - 2)), followUpCompleted: false, notes: "Needs assistance with a personal matter.", eventType: 'Support Request' },
];

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

// --- FORM SCHEMA ---
const eventFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  eventType: z.enum(['Check-in', 'Incident', 'Support Request', 'Meeting']),
  welfareDate: z.date({ required_error: "A welfare date is required." }),
  notes: z.string().optional(),
  followUpCompleted: z.boolean().default(false),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function WelfareTrackerPage() {
  // --- STATE MANAGEMENT ---
  const { toast } = useToast();
  const [events, setEvents] = React.useState<WelfareEvent[]>(initialEvents);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilters, setStatusFilters] = React.useState<Set<string>>(new Set());
  const [isSheetOpen, setSheetOpen] = React.useState(false);
  const [isAlertOpen, setAlertOpen] = React.useState(false);
  const [eventToEdit, setEventToEdit] = React.useState<WelfareEvent | null>(null);
  const [eventToDelete, setEventToDelete] = React.useState<string | null>(null);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      followUpCompleted: false,
      notes: ""
    }
  });

  // --- LOGIC & HELPERS ---
  const getEventStatus = React.useCallback((event: WelfareEvent) => {
    if (event.followUpCompleted) {
      return { text: "Follow-up completed", variant: "default" as StatusVariant, icon: CheckCircle2 };
    }
    const today = startOfToday();
    const dueDate = addDays(event.welfareDate, DUE_DAYS_CONFIG);
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
      .map(event => ({ event, status: getEventStatus(event) }))
      .filter(({ event, status }) => {
        const searchMatch =
          event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.eventType.toLowerCase().includes(searchTerm.toLowerCase());

        const statusMatch = statusFilters.size === 0 || Array.from(statusFilters).some(filter => statusMapping[filter]?.(status));
        
        return searchMatch && statusMatch;
      })
      .sort((a, b) => b.event.welfareDate.getTime() - a.event.welfareDate.getTime());
  }, [events, searchTerm, statusFilters, getEventStatus]);

  // --- HANDLERS ---
  const handleToggleFollowUp = (id: string) => {
    setEvents(
      events.map((e) => (e.id === id ? { ...e, followUpCompleted: !e.followUpCompleted } : e))
    );
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
        welfareDate: undefined,
        followUpCompleted: false,
        notes: "",
      });
    }
    setSheetOpen(true);
  };

  const onSubmit = (data: EventFormValues) => {
    try {
      if (eventToEdit) {
        // Update
        setEvents(events.map(e => e.id === eventToEdit.id ? { ...eventToEdit, ...data } : e));
      } else {
        // Create
        const newEvent: WelfareEvent = {
          id: `EVT${String(Date.now()).slice(-4)}`,
          avatarUrl: `https://picsum.photos/100/100?${Date.now()}`,
          ...data,
        };
        setEvents([newEvent, ...events]);
      }
      setSheetOpen(false);
      setEventToEdit(null);
    } catch(error) {
       toast({
        variant: "destructive",
        title: "Error saving event",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  };

  const handleDelete = (id: string) => {
    setEventToDelete(id);
    setAlertOpen(true);
  };

  const confirmDelete = () => {
    if (eventToDelete) {
      setEvents(events.filter((e) => e.id !== eventToDelete));
    }
    setAlertOpen(false);
    setEventToDelete(null);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Event Type', 'Welfare Date', 'Due Date', 'Status', 'Follow-up Completed', 'Notes'];
    const rows = filteredEvents.map(({event, status}) => [
      `"${event.id}"`,
      `"${event.name}"`,
      `"${event.eventType}"`,
      `"${format(event.welfareDate, 'yyyy-MM-dd')}"`,
      `"${format(addDays(event.welfareDate, DUE_DAYS_CONFIG), 'yyyy-MM-dd')}"`,
      `"${status.text}"`,
      event.followUpCompleted,
      `"${event.notes.replace(/"/g, '""')}"`
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-headline">Welfare Tracker</CardTitle>
              <CardDescription>Manage and monitor welfare events for your team.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button size="sm" onClick={() => handleOpenSheet(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Event
              </Button>
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
                {filteredEvents.length > 0 ? (
                  filteredEvents.map(({event, status}) => {
                    const { text: statusText, variant: statusVariant, icon: StatusIcon } = status;
                    const dueDate = addDays(event.welfareDate, DUE_DAYS_CONFIG);
                    return (
                      <TableRow key={event.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={event.avatarUrl} alt={event.name} data-ai-hint="person portrait" />
                              <AvatarFallback>{event.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{event.name}</span>
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
                              <DropdownMenuItem onClick={() => handleOpenSheet(event)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleFollowUp(event.id)}>
                                {event.followUpCompleted ? "Mark as Incomplete" : "Mark as Complete"}
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
      
      {/* --- Add/Edit Event Sheet --- */}
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
                          <SelectItem value="Check-in">Check-in</SelectItem>
                          <SelectItem value="Incident">Incident</SelectItem>
                          <SelectItem value="Support Request">Support Request</SelectItem>
                          <SelectItem value="Meeting">Meeting</SelectItem>
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
                <Button type="submit">
                  {eventToEdit ? 'Save Changes' : 'Create Event'}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* --- Delete Confirmation Dialog --- */}
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
    </>
  );
}
