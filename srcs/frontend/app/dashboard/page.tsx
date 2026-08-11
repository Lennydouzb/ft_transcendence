'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';

export default function DashboardPage() {
	const { loading, isAuthenticated } = useAuth();
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

	return <DashboardLayout />;
}
