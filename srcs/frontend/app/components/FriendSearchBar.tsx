'use client';

import { useState, SubmitEvent } from 'react';
import { fetchUsers, fetchAddFriend } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { Friend } from '../types';

type FriendSearchBarProps = {
	onFriendAdded: () => void;
};

export default function FriendSearchBar({ onFriendAdded }: FriendSearchBarProps) {
	const { token, user } = useAuth();
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<Friend[]>([]);
	const [searching, setSearching] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSearch(e: SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!query.trim())
			return;
		setSearching(true);
		setError(null);
		try {
			const users: Friend[] = await fetchUsers();
			const lowerQuery = query.toLowerCase();
			setResults(
				users.filter((u) => u.idUser !== user?.idUser && u.name.toLowerCase().includes(lowerQuery))
			);
		} finally {
			setSearching(false);
		}
	}

	async function handleAdd(idUser: number) {
		if (!token)
			return;
		setError(null);
		try {
			await fetchAddFriend(idUser, token);
			setResults((prev) => prev.filter((u) => u.idUser !== idUser));
			onFriendAdded();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Impossible d'ajouter cet ami");
		}
	}

	return (
		<div className="flex flex-col gap-2 border-b p-2">
			<form onSubmit={handleSearch} className="flex gap-2">
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Chercher un ami..."
					className="min-w-0 flex-1 rounded border px-3 py-2 text-sm"
				/>
				<button
					type="submit"
					disabled={searching}
					className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
				>
					{searching ? '...' : 'Chercher'}
				</button>
			</form>
			{error && <p className="text-xs text-red-600">{error}</p>}
			{results.length > 0 && (
				<ul className="flex flex-col gap-1">
					{results.map((u) => (
						<li
							key={u.idUser}
							className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-gray-100"
						>
							<span>{u.name}</span>
							<button
								type="button"
								onClick={() => handleAdd(u.idUser)}
								className="rounded bg-green-600 px-2 py-1 text-xs text-white"
							>
								Ajouter
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
