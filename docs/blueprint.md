# **App Name**: Ashridge Welfare Tracker

## Core Features:

- Event Capture: Capture welfare-related events, including relevant dates.
- Due Date Calculation: Automatically calculate follow-up due dates based on the welfare date and a configurable setting for due days.
- Overdue Status Calculation: Calculate overdue status, using a 'tool' that accounts for whether follow-up is done, and flagging items overdue >14 days for priority follow-up.
- Dynamic Status Display: Dynamically display the status of each event, including 'Missing welfare date', 'Follow-up completed', 'Overdue by X days', 'Due today', etc.
- Historical Data Storage: Store all welfare events as immutable records, preserving a complete history of actions.
- Search and Filter: Enable searching and filtering of events based on various criteria.
- Data Export: Allow exporting of welfare data in a common format (e.g., CSV).

## Style Guidelines:

- Primary color: Navy blue (#2E3A59) for a professional and trustworthy feel.
- Background color: Light gray (#F0F4F8) for a clean and neutral backdrop.
- Accent color: Teal (#3EA99F) to highlight overdue events and important actions.
- Body and headline font: 'PT Sans', a humanist sans-serif suitable for both headlines and body text, providing a balance of modernity and warmth.
- Use simple, clear icons to represent different types of welfare events and statuses.
- Employ a clean and intuitive layout, prioritizing clarity and ease of navigation.
- Use subtle transitions and animations to enhance the user experience and provide feedback on interactions.
- Responsive layout; desktop-first tables with sticky headers.
- Clear, high-contrast badges for statuses; colour hints but readable without colour.
- Input validation and inline error messages (e.g., invalid date).
- No blocking modals for routine actions; confirm destructive actions.