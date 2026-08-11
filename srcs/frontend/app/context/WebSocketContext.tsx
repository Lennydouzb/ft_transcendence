'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';

const WS_URL = 'ws://localhost:8080';

type ActionPayload = Record<string, unknown>;
type ActionListener = (payload: ActionPayload) => void;

type WebSocketContextType = {
	sendAction: (action: string, payload?: ActionPayload) => void;
	subscribe: (action: string, listener: ActionListener) => () => void;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
	const { token, isAuthenticated } = useAuth();
	const socketRef = useRef<WebSocket | null>(null);
	const listenersRef = useRef<Map<string, Set<ActionListener>>>(new Map());

	const sendAction = useCallback((action: string, payload: ActionPayload = {}) => {
		const socket = socketRef.current;
		if (!socket || socket.readyState !== WebSocket.OPEN)
			return;
		socket.send(JSON.stringify({ action, ...payload }));
	}, []);

	const subscribe = useCallback((action: string, listener: ActionListener) => {
		if (!listenersRef.current.has(action))
			listenersRef.current.set(action, new Set());
		listenersRef.current.get(action)!.add(listener);
		return () => {
			listenersRef.current.get(action)?.delete(listener);
		};
	}, []);

	useEffect(() => {
		if (!isAuthenticated || !token)
			return;

		const socket = new WebSocket(WS_URL);
		socketRef.current = socket;

		socket.onopen = () => {
			socket.send(JSON.stringify({ action: 'auth', token: `Bearer ${token}` }));
		};

		socket.onmessage = (event) => {
			let data: ActionPayload;
			try {
				data = JSON.parse(event.data);
			} catch {
				return;
			}
			const action = data.action as string | undefined;
			if (!action)
				return;
			listenersRef.current.get(action)?.forEach((listener) => listener(data));
		};

		return () => {
			socket.close();
			socketRef.current = null;
		};
	}, [isAuthenticated, token]);

	const value = useMemo(() => ({ sendAction, subscribe }), [sendAction, subscribe]);

	return (
		<WebSocketContext.Provider value={value}>
			{children}
		</WebSocketContext.Provider>
	);
}

export function useWebSocket() {
	const context = useContext(WebSocketContext);
	if (!context) {
		throw new Error('useWebSocket must be used within a WebSocketProvider');
	}
	return context;
}
