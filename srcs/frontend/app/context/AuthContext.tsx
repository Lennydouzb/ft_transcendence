
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

type AuthContextType = {
	token: string | null;
	login: (token: string) => void;
	logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [token, setToken] = useState<string | null>(null);
	useEffect(() => { setToken(localStorage.getItem('token')); }, []);

	const login = (newToken: string) => {
		setToken(newToken);
		localStorage.setItem('token', newToken);
	};

	const logout = () => {
		setToken(null);
		localStorage.removeItem('token');
	};

	return (
		<AuthContext.Provider value={{ token, login, logout }}>
		{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error('useAuth doit être utilisé dans un AuthProvider');
    return context;
}
