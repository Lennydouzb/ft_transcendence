'use client';

import { useEffect, useState } from 'react';
import { Friend } from '../types';
import { fetchFriends } from '../api/api';
import { useAuth } from '../context/AuthContext';
import FriendListItem from './FriendListItem';

type FriendsListProps = {
	refreshKey: number;
	selectedId: number | null;
	onSelect: (friend: Friend) => void;
};

export default function FriendsList({ refreshKey, selectedId, onSelect }: FriendsListProps) {
	const { token } = useAuth();
	const [friends, setFriends] = useState<Friend[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!token)
			return;
		fetchFriends(token)
			.then((data) => setFriends(data.friends ?? []))
			.catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'))
			.finally(() => setLoading(false));
	}, [token, refreshKey]);

	if (loading)
		return <p className="p-3 text-sm text-gray-500">Chargement...</p>;
	if (error)
		return <p className="p-3 text-sm text-red-600">{error}</p>;
	if (friends.length === 0)
		return <p className="p-3 text-sm text-gray-500">Pas encore d&apos;amis</p>;

	return (
		<div className="flex flex-col gap-1 overflow-y-auto p-2">
			{friends.map((friend) => (
				<FriendListItem
					key={friend.idUser}
					friend={friend}
					selected={friend.idUser === selectedId}
					onSelect={onSelect}
				/>
			))}
		</div>
	);
}
