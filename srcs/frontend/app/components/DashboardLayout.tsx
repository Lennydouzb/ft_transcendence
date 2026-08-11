'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Friend } from '../types';
import FriendsList from './FriendsList';
import FriendSearchBar from './FriendSearchBar';
import ChatWindow from './ChatWindow';
import ClickGameButton from './ClickGameButton';
import ScoreDisplay from './ScoreDisplay';

export default function DashboardLayout() {
	const { user, logout } = useAuth();
	const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
	const [refreshKey, setRefreshKey] = useState(0);

	return (
		<div className="flex h-screen flex-col">
			<header className="flex items-center justify-between border-b px-4 py-2">
				<span className="font-semibold">{user?.name}</span>
				<ScoreDisplay />
				<button
					onClick={logout}
					className="rounded bg-red-600 px-3 py-1 text-sm text-white"
				>
					Se déconnecter
				</button>
			</header>

			<div className="flex flex-1 overflow-hidden">
				<aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r">
					<FriendSearchBar onFriendAdded={() => setRefreshKey((k) => k + 1)} />
					<FriendsList
						refreshKey={refreshKey}
						selectedId={selectedFriend?.idUser ?? null}
						onSelect={setSelectedFriend}
					/>
				</aside>

				<main className="flex-1">
					{selectedFriend ? (
						<ChatWindow friend={selectedFriend} />
					) : (
						<div className="flex h-full items-center justify-center text-gray-400">
							Sélectionne un ami pour discuter
						</div>
					)}
				</main>
			</div>

			<ClickGameButton />
		</div>
	);
}
