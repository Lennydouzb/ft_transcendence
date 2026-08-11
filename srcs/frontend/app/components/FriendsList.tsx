'use client';

import { useEffect, useState } from 'react';
import { Friend } from '../types';
import { fetchFriends, fetchRemoveFriend, ApiError } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import FriendListItem from './FriendListItem';

type FriendsListProps = {
	refreshKey: number;
	selectedId: number | null;
	onSelect: (friend: Friend) => void;
};

export default function FriendsList({ refreshKey, selectedId, onSelect }: FriendsListProps) {
	const { token } = useAuth();
	const { subscribe } = useWebSocket();
	const [friends, setFriends] = useState<Friend[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [removeError, setRemoveError] = useState<string | null>(null);
	const [removingId, setRemovingId] = useState<number | null>(null);


	useEffect(() => {
		const unsubAdded = subscribe('friendAdded', () => {
			if (!token)
				return;
			fetchFriends(token)
			.then((data) => {
				const raw: Friend[] = data.friends ?? [];
				const deduped = Array.from(new Map(raw.map((f) => [f.idUser, f])).values());
				setFriends(deduped);
			})
			.catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'))
			.finally(() => setLoading(false)); 
		});

		const unsubRemoved = subscribe('friendRemoved', (payload) => {
			if (!token)
				return;
			fetchFriends(token)
			.then((data) => {
				const raw: Friend[] = data.friends ?? [];
				const deduped = Array.from(new Map(raw.map((f) => [f.idUser, f])).values());
				setFriends(deduped);
			})
			.catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'))
			.finally(() => setLoading(false));
		});
	}, [token, refreshKey, subscribe];

	useEffect(() => {
		if (!token)
			return;
		fetchFriends(token)
		.then((data) => {
			const raw: Friend[] = data.friends ?? [];
			const deduped = Array.from(new Map(raw.map((f) => [f.idUser, f])).values());
			setFriends(deduped);
		})
		.catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'))
		.finally(() => setLoading(false));
	}, [token, refreshKey]);

	async function handleRemove(idUser: number) {
		if (!token || removingId === idUser)
			return;
		setRemoveError(null);
		setRemovingId(idUser);
		try {
			await fetchRemoveFriend(idUser, token);
			setFriends((prev) => prev.filter((f) => f.idUser !== idUser));
		} catch (err) {
			if (err instanceof ApiError && err.status === 404) {
				// déjà retiré côté serveur (ex: l'autre personne l'a fait de son côté) : on aligne juste l'affichage
				setFriends((prev) => prev.filter((f) => f.idUser !== idUser));
			} else {
				setRemoveError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
			}
		} finally {
			setRemovingId(null);
		}
	}

	if (loading)
		return <p className="p-3 text-sm text-gray-500">Chargement...</p>;
	if (error)
		return <p className="p-3 text-sm text-red-600">{error}</p>;

	return (
		<div className="flex flex-col gap-1 overflow-y-auto p-2">
		{removeError && <p className="px-1 text-xs text-red-600">{removeError}</p>}
		{friends.length === 0 ? (
			<p className="p-3 text-sm text-gray-500">Pas encore d&apos;amis</p>
		) : (
		friends.map((friend) => (
			<FriendListItem
			key={friend.idUser}
			friend={friend}
			selected={friend.idUser === selectedId}
			onSelect={onSelect}
			onRemove={handleRemove}
			removing={removingId === friend.idUser}
			/>
		))
		)}
		</div>
	);
}
