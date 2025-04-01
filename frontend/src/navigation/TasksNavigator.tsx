// frontend/src/navigation/TasksNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TasksScreen from '../screens/tasks/TasksScreen';
import CreateTaskScreen from '../screens/tasks/CreateTaskScreen';
import TaskDetailScreen from '../screens/tasks/TaskDetailScreen';

// Define navigation types
export type TasksStackParamList = {
    TasksList: undefined;
    CreateTask: undefined;
    TaskDetail: { taskId: string };
};

const Stack = createStackNavigator<TasksStackParamList>();

const TasksNavigator = () => {
    return (
        <Stack.Navigator
            initialRouteName="TasksList"
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="TasksList" component={TasksScreen} />
            <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
            <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
        </Stack.Navigator>
    );
};

export default TasksNavigator;