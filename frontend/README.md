# ADHD Assistant App

A cross-platform mobile application designed to help users with ADHD manage tasks, track progress, and improve productivity.

## Project Overview

We're building a cross-platform mobile app (Android initially, iOS later) to help users with ADHD manage tasks, track progress, and improve productivity.

## Features

- AI-powered task breakdown
- Calendar integration
- Notification support
- Medication tracking
- Mood and symptom journaling
- Progress visualization

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Next.js for API routes
- **Database & Authentication**: Supabase
- **Payments**: Stripe (for "Buy Me a Coffee" feature)
- **AI Integration**: Free AI tools for task breakdown

## Project Structure

```

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- Stripe account (for payment features)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/adhd-assistant.git
   cd adhd-assistant
   ```

2. Install dependencies for the React Native app
   ```bash
   cd frontend
   npm install
   ```

3. Install dependencies for the Next.js backend
   ```bash
   cd ../backend
   npm install
   ```

4. Set up environment variables
   - Create `.env` files in both the `frontend` and `backend` directories
   - Add the following variables (replace with your actual values):

   For `frontend/.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   For `backend/.env`:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   ```

### Running the App

1. Start the Next.js backend
   ```bash
   cd backend
   npm run dev
   ```

2. Start the React Native app
   ```bash
   cd frontend
   npx expo start
   ```

3. Use the Expo Go app on your mobile device to scan the QR code, or press `a` to open in an Android emulator.

## Database Setup

The app uses Supabase as the backend database. Here's the database schema:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT,
  avatar_url TEXT,
  notification_preferences JSONB DEFAULT '{}'
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT CHECK (status IN ('active', 'completed')),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  time_of_day TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE medication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  taken BOOLEAN DEFAULT TRUE,
  notes TEXT
);

CREATE TABLE mood_journals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 5),
  focus_rating INTEGER CHECK (focus_rating BETWEEN 1 AND 5),
  energy_rating INTEGER CHECK (energy_rating BETWEEN 1 AND 5),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  symptoms TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Development Timeline

- **Day 1**: Setup & Basic Structure
- **Day 2**: Core Functionality
- **Day 3**: Refinement & Polish
- **Future**: iOS Adaptation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
adhd-assistant/ (Root directory)
├── frontend/ (React Native App with Expo)
│   ├── App.tsx (Main app entry point)
│   ├── app.json (Expo configuration)
│   ├── src/
│   │   ├── components/ (Reusable UI components)
│   │   ├── screens/ (Screen components)
│   │   │   ├── auth/ (Authentication screens)
│   │   │   ├── tasks/ (Task management screens)
│   │   │   ├── calendar/ (Calendar views)
│   │   │   ├── journal/ (Mood journal screens)
│   │   │   ├── medications/ (Medication tracking)
│   │   │   └── profile/ (User profile screens)
│   │   ├── navigation/ (Navigation configuration)
│   │   ├── hooks/ (Custom React hooks)
│   │   ├── utils/ (Utility functions)
│   │   ├── services/ (API services)
│   │   ├── context/ (React context providers)
│   │   └── constants/ (App constants)
│   └── assets/ (Images, fonts, etc.)
│
└── backend/ (Next.js Backend)
├── src/
│   ├── app/ (Next.js App Router)
│   │   ├── api/ (API routes)
│   │   │   ├── auth/ (Authentication endpoints)
│   │   │   ├── tasks/ (Task management endpoints)
│   │   │   ├── calendar/ (Calendar endpoints)
│   │   │   ├── notifications/ (Notification endpoints)
│   │   │   └── payments/ (Stripe payment endpoints)
│   │   └── page.tsx (Landing page)
│   ├── lib/ (Shared libraries)
│   └── utils/ (Utility functions)
└── public/ (Static assets)