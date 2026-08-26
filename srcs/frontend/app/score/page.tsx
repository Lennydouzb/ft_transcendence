'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { fetchUsers } from '../api/api';
import { Friend } from '../types';

export default function ScorePage() {
	const { user, loading, isAuthenticated } = useAuth();
	const router = useRouter();

	const [ranking, setRanking] = useState<Friend[]>([]);
	const [rankingLoading, setRankingLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!loading && !isAuthenticated)
			router.push('/login');
	}, [loading, isAuthenticated, router]);

	useEffect(() => {
		fetchUsers()
			.then((users: Friend[]) => {
				const sorted = [...users].sort((a, b) => (b.scoreTotal ?? 0) - (a.scoreTotal ?? 0));
				setRanking(sorted);
			})
			.catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'))
			.finally(() => setRankingLoading(false));
	}, []);

	if (loading || !isAuthenticated) {
		return (
			<main className="flex min-h-screen items-center justify-center">
				<p>Chargement...</p>
			</main>
		);
	}

	return (
		<main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
			<Link href="/dashboard" className="text-sm underline">
				&larr; Retour au dashboard
			</Link>

			<h1 className="text-2xl font-bold">Classement</h1>

			{rankingLoading && <p className="text-sm text-gray-500">Chargement...</p>}
			{error && <p className="text-sm text-red-600">{error}</p>}

			{!rankingLoading && !error && (
				<ol className="flex flex-col gap-1">
					{ranking.map((u, index) => (
						<li
							key={u.idUser}
							className={`flex items-center justify-between rounded px-3 py-2 text-sm text-gray-900 ${
								u.idUser === user?.idUser ? 'bg-blue-100 font-semibold' : 'bg-gray-50'
							}`}
						>
							<span>
								{index + 1}. {u.name}
							</span>
							<span>{u.scoreTotal ?? 0}</span>
						</li>
					))}
				</ol>
			)}
		</main>
	);
}
