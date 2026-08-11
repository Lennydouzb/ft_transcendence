'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useWebSocket } from './WebSocketContext';
import { useAuth } from './AuthContext';
import { fetchGetConvos } from '../api/api';

export type ChatMessage = {
	content: string;
	sendDate: string;
	fromMe: boolean;
	senderName?: string;
};

type Conversations = Record<number, ChatMessage[]>;

type ChatContextType = {
	getMessages: (idUser: number) => ChatMessage[];
	sendMessage: (idUser: number, content: string) => void;
	setHistory: (idUser: number, messages: ChatMessage[]) => void;
};

type ConvoRow = {
	idMessage: number;
	content: string;
	sendDate: string;
	senderId: number;
	idUser: number;
	idUser_1: number;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
	const { sendAction, subscribe } = useWebSocket();
	const { user, token } = useAuth();
	const [conversations, setConversations] = useState<Conversations>({});

	useEffect(() => {
		const unsubscribe = subscribe('msg', (payload) => {
			const fromId = payload.idUser as number;
			const incoming: ChatMessage = {
				content: payload.message as string,
				sendDate: new Date().toISOString(),
				fromMe: false,
				senderName: payload.name as string | undefined,
			};
			setConversations((prev) => ({
				...prev,
				[fromId]: [...(prev[fromId] ?? []), incoming],
			}));
		});
		return unsubscribe;
	}, [subscribe]);

	useEffect(() => {
		if (!user || !token)
			return;
		fetchGetConvos(token)
			.then((data) => {
				// trié par idMessage (ordre d'insertion garanti) plutôt que sendDate,
				// qui n'a qu'une précision à la seconde et peut avoir des égalités
				const rows: ConvoRow[] = [...(data.convos ?? [])].sort((a, b) => a.idMessage - b.idMessage);
				const grouped: Conversations = {};
				for (const row of rows) {
					const otherUserId = row.idUser === user.idUser ? row.idUser_1 : row.idUser;
					if (!grouped[otherUserId])
						grouped[otherUserId] = [];
					grouped[otherUserId].push({
						content: row.content,
						sendDate: row.sendDate,
						fromMe: row.senderId === user.idUser,
					});
				}
				setConversations((prev) => ({ ...grouped, ...prev }));
			})
			.catch(() => {});
	}, [user, token]);

	const sendMessage = useCallback((idUser: number, content: string) => {
		sendAction('msg', { idUser, message: content });
		const outgoing: ChatMessage = {
			content,
			sendDate: new Date().toISOString(),
			fromMe: true,
		};
		setConversations((prev) => ({
			...prev,
			[idUser]: [...(prev[idUser] ?? []), outgoing],
		}));
	}, [sendAction]);

	const setHistory = useCallback((idUser: number, messages: ChatMessage[]) => {
		setConversations((prev) => ({ ...prev, [idUser]: messages }));
	}, []);

	const getMessages = useCallback((idUser: number) => {
		return conversations[idUser] ?? [];
	}, [conversations]);

	const value = useMemo(
		() => ({ getMessages, sendMessage, setHistory }),
		[getMessages, sendMessage, setHistory]
	);

	return (
		<ChatContext.Provider value={value}>
			{children}
		</ChatContext.Provider>
	);
}

export function useChat() {
	const context = useContext(ChatContext);
	if (!context) {
		throw new Error('useChat must be used within a ChatProvider');
	}
	return context;
}
