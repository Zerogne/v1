# Project Workspace - Phase 2

A v0-like frontend builder workspace system that supports Projects → Files → Snapshots (version history) → Chat Sessions linked to snapshots.

## Tech Stack

- **Next.js 16** (App Router) with TypeScript
- **TailwindCSS** for styling
- **shadcn/ui** components
- **Prisma ORM** with SQLite (default) / PostgreSQL support
- **Zod** for validation

## Features

- ✅ Create, list, and open projects
- ✅ Create and edit files in a project
- ✅ Create snapshots (immutable saved versions of project files)
- ✅ Create chat sessions linked to snapshots
- ✅ Clean, minimal cream-white UI theme
- ✅ File tree with nested structure
- ✅ Read-only snapshot viewing

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Install dependencies:**

```bash
npm install
```

2. **Set up the database:**

Create a `.env` file in the root directory (if it doesn't exist) and add:

```env
DATABASE_URL="file:./dev.db"
```

For PostgreSQL, use:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

**Note:** Make sure the `.env` file exists before running migrations or starting the dev server.

3. **Run Prisma migrations:**

```bash
npx prisma migrate dev --name init
```

This will:
- Create the SQLite database file (`dev.db`)
- Generate the Prisma Client
- Apply all migrations

4. **Generate Prisma Client:**

```bash
npx prisma generate
```

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You'll be redirected to `/dashboard`.

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── projects/     # Project CRUD
│   │   ├── files/        # File operations
│   │   ├── snapshots/    # Snapshot operations
│   │   └── projects/[id]/chats/  # Chat sessions
│   ├── dashboard/        # Dashboard page
│   ├── projects/[id]/    # Project workspace page
│   └── layout.tsx        # Root layout
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── file-tree.tsx     # File tree component
│   └── toaster.tsx       # Toast notifications
├── lib/
│   ├── prisma.ts         # Prisma client singleton
│   ├── utils.ts          # Utility functions
│   └── validations.ts    # Zod schemas
└── prisma/
    └── schema.prisma     # Database schema
```

## API Routes

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create a project
- `GET /api/projects/[id]` - Get project details

### Files
- `GET /api/projects/[id]/files` - List project files
- `POST /api/projects/[id]/files` - Create a file
- `PUT /api/files/[fileId]` - Update file content
- `DELETE /api/files/[fileId]` - Soft delete a file

### Snapshots
- `GET /api/projects/[id]/snapshots` - List snapshots
- `POST /api/projects/[id]/snapshots` - Create a snapshot
- `GET /api/snapshots/[snapshotId]/files` - Get snapshot files

### Chat Sessions
- `GET /api/projects/[id]/chats` - List chat sessions
- `POST /api/projects/[id]/chats` - Create a chat session

## Database Schema

- **Project**: Projects container
- **ProjectFile**: Files in a project (with soft delete support)
- **Snapshot**: Immutable snapshots of project state
- **SnapshotFile**: Files captured in a snapshot
- **ChatSession**: Chat sessions linked to snapshots
- **ChatMessage**: Messages in chat sessions (for future use)

## Usage

1. **Create a Project**: Click "New Project" on the dashboard
2. **Add Files**: Click "New File" in the file tree, enter a path (e.g., `app/page.tsx`)
3. **Edit Files**: Click a file in the tree, edit in the middle panel, click "Save"
4. **Create Snapshot**: Click "Create" in the Snapshots panel to save current state
5. **View Snapshot**: Click a snapshot to view its files (read-only)
6. **Create Chat Session**: Click "New" in Chat Sessions, requires a snapshot

## Styling

The app uses a cream-white theme with:
- Background: `#faf7f0`
- Cards: `#fffaf2`
- Borders: `#e7e0d6`
- Text: `#111111`

All colors are defined as CSS variables in `app/globals.css` for easy customization.

## Building for Production

```bash
npm run build
npm start
```

## Database Migrations

To create a new migration:

```bash
npx prisma migrate dev --name migration_name
```

To reset the database (⚠️ deletes all data):

```bash
npx prisma migrate reset
```

## Switching to PostgreSQL

1. Update `.env` with your PostgreSQL connection string
2. Update `prisma/schema.prisma` datasource provider to `postgresql`
3. Run migrations: `npx prisma migrate dev`

## License

MIT
