'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { fetchLogin, fetchCreateUser, fetchUpdateUserName, fetchGetUser } from '../api/api';

type User = {
	idUser: number;
	name: string;
};

type AuthContextType = {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	loading: boolean;
	login: (mail: string, password: string) => Promise<void>;
	register: (name: string, mail: string, password: string) => Promise<void>;
	updateName: (name: string) => Promise<void>;
	logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeToken(token: string): { user: User; exp: number } | null {
	try {
		const payload = token.split('.')[1];
		const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
		const decoded = JSON.parse(json);
		return { user: { idUser: decoded.idUser, name: decoded.name }, exp: decoded.exp };
	} catch {
		return null;
	}
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [token, setToken] = useState<string | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function initAuth() {
			const stored = localStorage.getItem('token');
			if (stored) {
				const decoded = decodeToken(stored);
				if (decoded && decoded.exp * 1000 > Date.now()) {
					try {
						// Vérifie que l'utilisateur existe toujours en base de données (ex: après un make re)
						const data = await fetchGetUser(decoded.user.idUser);
						if (!Array.isArray(data) || data.length === 0) {
							throw new Error('User not found in DB');
						}
						setToken(stored);
						setUser({ idUser: decoded.user.idUser, name: data[0].name });
					} catch {
						localStorage.removeItem('token');
						setToken(null);
						setUser(null);
					}
				} else {
					localStorage.removeItem('token');
					setToken(null);
					setUser(null);
				}
			}
			setLoading(false);
		}
		initAuth();
	}, []);

	function applyToken(newToken: string) {
		const decoded = decodeToken(newToken);
		localStorage.setItem('token', newToken);
		setToken(newToken);
		setUser(decoded?.user ?? null);
	}

	async function login(mail: string, password: string) {
		const data = await fetchLogin(mail, password);
		applyToken(data.token);
	}

	async function register(name: string, mail: string, password: string) {
		const data = await fetchCreateUser(name, password, mail);
		applyToken(data.token);
	}

	async function updateName(name: string) {
		if (!token)
			return;
		await fetchUpdateUserName(name, token);
		setUser((prev) => (prev ? { ...prev, name } : prev));
	}

	function logout() {
		localStorage.removeItem('token');
		setToken(null);
		setUser(null);
	}

	return (
		<AuthContext.Provider value={{ user, token, isAuthenticated: !!token, loading, login, register, updateName, logout }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
