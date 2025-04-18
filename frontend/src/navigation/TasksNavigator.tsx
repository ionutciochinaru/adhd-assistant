// frontend/src/navigation/TasksNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TasksScreen from '../screens/tasks/TasksScreen';
import CreateTaskScreen from '../screens/tasks/CreateTaskScreen';
import PomodoroScreen from "../screens/tasks/PomodoroScreen";

// Define navigation types
export type TasksStackParamList = {
    TasksList: { selectDate?: string, refreshTasks?: boolean };
    CreateTask: { selectedDate?: string };
    TaskDetail: { taskId: string };
    PomodoroScreen: { task: any };
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
            <Stack.Screen name="PomodoroScreen" component={PomodoroScreen} />
        </Stack.Navigator>
    );
};

export default TasksNavigator;