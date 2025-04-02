// backend/src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

const handleApiError = (error: any, message = 'Internal server error') => {
    console.error('Tasks API error:', error);
    return NextResponse.json(
        { error: error.message || message },
        { status: error.status || 500 }
    );
};

// Helper to verify user session
async function getUserFromRequest(request: NextRequest) {
    try {
        // Try to get the session from the cookie
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            console.log('Token found in auth header');

            const { data, error } = await supabase.auth.getUser(token);

            if (error || !data.user) {
                console.error('Error verifying token:', error);
                return null;
            }

            return data.user;
        } else {
            // Fallback to session cookie authentication
            const { data, error } = await supabase.auth.getSession();

            if (error || !data.session) {
                console.error('No valid session found:', error);
                return null;
            }

            return data.session.user;
        }
    } catch (error) {
        return handleApiError(error);
    }
}

// Get all tasks for a user
export async function GET(request: NextRequest) {
    try {
        console.log('GET /tasks request received');

        const user = await getUserFromRequest(request);
        if (!user) {
            console.error('Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('Authorized user:', user.id);

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');

        // Build query
        let query = supabase
            .from('tasks')
            .select('*, subtasks(*)')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true });

        // Add filters if provided
        if (status) {
            query = query.eq('status', status);
        }

        if (priority) {
            query = query.eq('priority', priority);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Database query error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        console.log(`Found ${data?.length || 0} tasks`);
        return NextResponse.json({ tasks: data });
    } catch (error) {
        return handleApiError(error);
    }
}

// Create a new task
export async function POST(request: NextRequest) {
    try {
        console.log('POST /tasks request received');

        const user = await getUserFromRequest(request);
        if (!user) {
            console.error('Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('Authorized user:', user.id);

        const { title, description, priority, due_date, subtasks } = await request.json();

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        console.log('Creating task:', { title, priority, due_date });

        // Insert the task
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .insert({
                user_id: user.id,
                title,
                description,
                priority: priority || 'medium',
                status: 'active',
                due_date: due_date || null,
            })
            .select()
            .single();

        if (taskError) {
            console.error('Task creation error:', taskError);
            return NextResponse.json({ error: taskError.message }, { status: 400 });
        }

        console.log('Task created with ID:', task.id);

        // If subtasks were provided, insert them
        if (subtasks && Array.isArray(subtasks) && subtasks.length > 0) {
            console.log('Adding subtasks:', subtasks.length);

            const subtasksToInsert = subtasks.map((title: string) => ({
                task_id: task.id,
                title,
                status: 'active',
            }));

            const { error: subtasksError } = await supabase
                .from('subtasks')
                .insert(subtasksToInsert);

            if (subtasksError) {
                console.error('Error inserting subtasks:', subtasksError);
            }
        }

        // Return the created task
        const { data: fullTask, error: getError } = await supabase
            .from('tasks')
            .select('*, subtasks(*)')
            .eq('id', task.id)
            .single();

        if (getError) {
            console.error('Error fetching complete task:', getError);
            return NextResponse.json({ error: getError.message }, { status: 400 });
        }

        return NextResponse.json({ task: fullTask }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

// Update a task
export async function PUT(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, title, description, priority, status, due_date } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        // Verify task belongs to user
        const { data: existingTask, error: getError } = await supabase
            .from('tasks')
            .select()
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (getError || !existingTask) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const updates: any = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (priority !== undefined) updates.priority = priority;
        if (status !== undefined) {
            updates.status = status;
            // If task is being completed, set completed_at
            if (status === 'completed' && existingTask.status !== 'completed') {
                updates.completed_at = new Date().toISOString();
            }
            // If task is being uncompleted, clear completed_at
            if (status === 'active' && existingTask.status === 'completed') {
                updates.completed_at = null;
            }
        }
        if (due_date !== undefined) updates.due_date = due_date;

        // Update the task
        const { data: updatedTask, error: updateError } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', id)
            .select('*, subtasks(*)')
            .single();

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        return NextResponse.json({ task: updatedTask });
    } catch (error) {
        return handleApiError(error);
    }
}

// Delete a task
export async function DELETE(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        // Verify task belongs to user
        const { data: existingTask, error: getError } = await supabase
            .from('tasks')
            .select()
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (getError || !existingTask) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Delete the task (this will cascade to subtasks due to the foreign key constraint)
        const { error: deleteError } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}