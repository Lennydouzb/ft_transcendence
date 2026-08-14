'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef, ReactNode } from 'react';
import { useWebSocket } from './WebSocketContext';
import { useAuth } from './AuthContext';
import { fetchGetUser } from '../api/api';

type Feedback = {
	message: string;
	success: boolean;
	position: Position;
	id: number;
};

type GameContextType = {
	visible: boolean;
	position: Position | null;
	score: number | null;
	click: () => void;
	feedback: Feedback | null;
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
	const [feedback, setFeedback] = useState<Feedback | null>(null);

	// Garder une trace de la position actuelle pour le feedback sans relancer l'effet
	const positionRef = useRef<Position | null>(null);
	useEffect(() => {
		positionRef.current = position;
	}, [position]);

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
			setVisible((prevVisible) => {
				if (prevVisible && positionRef.current) {
					setFeedback({
						message: 'Game lost :(',
						success: false,
						position: positionRef.current,
						id: Date.now()
					});
					setTimeout(() => setFeedback(null), 1500);
				}
				return false;
			});
		});
		const unsubResult = subscribe('clickResult', (payload) => {
			setVisible(false);
			if (positionRef.current) {
				setFeedback({
					message: payload.success ? 'Game won !' : 'Game lost :(',
					success: !!payload.success,
					position: positionRef.current,
					id: Date.now()
				});
				// Effacer le feedback après 1.5s
				setTimeout(() => setFeedback(null), 1500);
			}

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
		() => ({ visible, position, score, click, feedback }),
		[visible, position, score, click, feedback]
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
