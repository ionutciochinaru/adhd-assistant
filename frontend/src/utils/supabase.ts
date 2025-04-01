// frontend/src/utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types based on your schema
export type User = {
    id: string;
    email: string;
    created_at: string;
    name: string | null;
    avatar_url: string | null;
    notification_preferences: Record<string, any>;
};

export type Task = {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    priority: 'low' | 'medium' | 'high';
    status: 'active' | 'completed';
    due_date: string | null;
    created_at: string;
    completed_at: string | null;
};

export type Subtask = {
    id: string;
    task_id: string;
    title: string;
    status: 'active' | 'completed';
    created_at: string;
    completed_at: string | null;
};

export type Medication = {
    id: string;
    user_id: string;
    name: string;
    dosage: string | null;
    frequency: string | null;
    time_of_day: string[];
    notes: string | null;
    created_at: string;
    active: boolean;
};

export type MedicationLog = {
    id: string;
    user_id: string;
    medication_id: string;
    taken_at: string;
    taken: boolean;
    notes: string | null;
};

export type MoodJournal = {
    id: string;
    user_id: string;
    date: string;
    mood_rating: number;
    focus_rating: number;
    energy_rating: number;
    sleep_quality: number;
    symptoms: string[];
    notes: string | null;
    created_at: string;
};