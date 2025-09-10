# Ashridge Group - Employee Welfare Tracker

![Ashridge Group](https://ashridge-group-com.nimbus-cdn.uk/wp-content/uploads/2018/10/logo-ash-grp.png)

This is a Next.js application built for **Ashridge Group** to track employee welfare events. The system allows for creating, updating, deleting, and filtering welfare events, with a configurable recurring follow-up system designed specifically for Ashridge Group's employee welfare management needs.

## Prerequisites

Make sure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Navigate to the project directory:
    ```bash
    cd <project-directory>
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Application

To run the development server, use the following command:

```bash
npm run dev
```

This will start the Next.js application on `http://localhost:9002`.

This project also includes Genkit for potential AI features. To run the Genkit development server, you can use:
```bash
npm run genkit:dev
```

## Data Storage

The application uses a flexible storage system that adapts to different environments:

- **Development**: Local JSON file storage (`src/data/welfare-events.json`)
- **Production**: In-memory storage with environment variable initialization

### Data Management Scripts

- `npm run data:export`: Export current data for production deployment
- `npm run data:import`: Import data from environment variables
- `npm run data:backup`: Create a timestamped backup of current data

## Production Deployment

For production deployment instructions, see [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md).

**Important**: The current production setup uses in-memory storage. For mission-critical applications, consider upgrading to a persistent database solution like Firestore, PostgreSQL, or MongoDB.

## Available Scripts

In the project directory, you can run:

-   `npm run dev`: Runs the app in development mode with Turbopack.
-   `npm run build`: Builds the app for production.
-   `npm run start`: Starts a production server.
-   `npm run lint`: Runs the linter to check for code quality issues.
-   `npm run typecheck`: Runs TypeScript type checking.
-   `npm run genkit:dev`: Starts the Genkit development server.
-   `npm run genkit:watch`: Starts the Genkit development server in watch mode.
-   `npm run data:export`: Export welfare events data for production deployment.
-   `npm run data:import`: Import welfare events data from environment variables.
-   `npm run data:backup`: Create a timestamped backup of the current data.
-   `npm run test:api`: Run API endpoint tests.

## Security & Authentication

This application includes a secure authentication system to protect sensitive employee welfare data.

### Login Credentials
- **Username**: `ashridge`  
- **Password**: `Ashridge@Wel!2025`

### Security Features
- HTTP Basic Authentication with branded login interface
- Session management with secure cookies
- Middleware-based route protection
- One-click logout functionality

📖 **[Complete Authentication Guide](docs/AUTHENTICATION.md)**

## Ashridge Group Branding

This application features full Ashridge Group branding including:

- Official Ashridge Group logo and color scheme
- Professional styling matching corporate identity
- Branded header and footer sections
- Custom favicon and metadata

## Production Deployment

For production deployment with proper data persistence, see our comprehensive guide:

📖 **[Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT.md)**

The application includes a flexible storage system that works in both development and production environments, with special considerations for serverless deployments.
-   `npm run data:export`: Export welfare events data for production.
-   `npm run data:import`: Import welfare events data from environment.
-   `npm run data:backup`: Create a backup of current data.

