'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useWebSocket } from './WebSocketContext';
import { useAuth } from './AuthContext';
import { fetchGetUser } from '../api/api';

type Position = { x: number; y: number };

type GameContextType = {
	visible: boolean;
	position: Position | null;
	score: number | null;
	click: () => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

const BUTTON_MARGIN = 80;

function randomPosition(): Position {
	return {
		x: Math.random() * (window.innerWidth - BUTTON_MARGIN),
		y: Math.random() * (window.innerHeight - BUTTON_MARGIN),
	};
}

export function GameProvider({ children }: { children: ReactNode }) {
	const { sendAction, subscribe } = useWebSocket();
	const { token, user } = useAuth();
	const [visible, setVisible] = useState(false);
	const [position, setPosition] = useState<Position | null>(null);
	const [score, setScore] = useState<number | null>(null);

	useEffect(() => {
		if (!user)
			return;
		fetchGetUser(user.idUser)
			.then((data) => {
				const found = data?.[0];
				if (found && typeof found.scoreTotal === 'number')
					setScore(found.scoreTotal);
			})
			.catch(() => {});
	}, [user]);

	useEffect(() => {
		const unsubSpawn = subscribe('spawn', () => {
			setPosition(randomPosition());
			setVisible(true);
		});
		const unsubGone = subscribe('gone', () => {
			setVisible(false);
		});
		const unsubResult = subscribe('clickResult', (payload) => {
			setVisible(false);
			if (payload.success && typeof payload.scoreTotal === 'number')
				setScore(payload.scoreTotal);
		});
		return () => {
			unsubSpawn();
			unsubGone();
			unsubResult();
		};
	}, [subscribe]);

	const click = useCallback(() => {
		if (!token)
			return;
		sendAction('click', { token: `Bearer ${token}` });
		setVisible(false);
	}, [sendAction, token]);

	const value = useMemo(
		() => ({ visible, position, score, click }),
		[visible, position, score, click]
	);

	return (
		<GameContext.Provider value={value}>
			{children}
		</GameContext.Provider>
	);
}

export function useGame() {
	const context = useContext(GameContext);
	if (!context) {
		throw new Error('useGame must be used within a GameProvider');
	}
	return context;
}
