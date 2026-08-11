'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';

export default function Home() {
	const { loading, isAuthenticated } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (loading)
			return;
		router.push(isAuthenticated ? '/dashboard' : '/login');
	}, [loading, isAuthenticated, router]);

	return (
		<main className="flex min-h-screen items-center justify-center">
			<p>Chargement...</p>
		</main>
	);
}
