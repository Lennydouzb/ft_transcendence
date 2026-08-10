'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
	const { user, loading, isAuthenticated, logout } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !isAuthenticated) {
			router.push('/login');
		}
	}, [loading, isAuthenticated, router]);

	if (loading || !isAuthenticated) {
		return (
			<main className="flex min-h-screen items-center justify-center">
				<p>Chargement...</p>
			</main>
		);
	}

	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-4">
			<h1 className="text-2xl font-bold">Bienvenue, {user?.name}</h1>
			<button
				onClick={logout}
				className="rounded bg-red-600 px-4 py-2 text-white"
			>
				Se déconnecter
			</button>
		</main>
	);
}
