import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authAPI, employeesAPI } from '../services/api';

export type Employee = {
    id: string;
    name: string;
    phone_number: string;
    employee_role: string;
    district?: string;
    created_at?: string;
    updated_at?: string;
};

type AuthContextType = {
    user: Employee | null;
    token: string | null;
    loading: boolean;
    error: string | null;
    login: (phoneNumber: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<Employee | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');

        if (stored && storedUser) {
            try {
                setToken(stored);
                setUser(JSON.parse(storedUser));
            } catch (e) {
                // Clear invalid stored data
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
            }
        }

        setLoading(false);
    }, []);

    const login = async (phoneNumber: string, password: string) => {
        setLoading(true);
        setError(null);

        try {
            const data = await authAPI.login(phoneNumber, password);
            const { employee, token: newToken } = data;

            setUser(employee);
            setToken(newToken);

            // Persist to localStorage
            localStorage.setItem('auth_token', newToken);
            localStorage.setItem('auth_user', JSON.stringify(employee));

            // Fetch and store employees list after successful login
            try {
                const employeesList = await employeesAPI.list(newToken);
                if (employeesList?.data && Array.isArray(employeesList.data)) {
                    // Extract only name, phone_number, and employee_role from each employee
                    const simplifiedEmployees = employeesList.data.map((emp: any) => ({
                        name: emp.name,
                        phone_number: emp.phone_number,
                        employee_role: emp.employee_role,
                    }));
                    localStorage.setItem('employees_list', JSON.stringify(simplifiedEmployees));
                }
            } catch (empErr) {
                console.error('Error fetching employees list:', empErr);
                // Non-critical error, don't throw
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred during login';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        setError(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('employees_list');
    };

    const value: AuthContextType = {
        user,
        token,
        loading,
        error,
        login,
        logout,
        isAuthenticated: !!user && !!token,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
