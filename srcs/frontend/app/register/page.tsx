'use client';

import { useState, useEffect, SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
	const { register, loading, isAuthenticated } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && isAuthenticated)
			router.push('/dashboard');
	}, [loading, isAuthenticated, router]);

	const [name, setName] = useState('');
	const [mail, setMail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			await register(name, mail, password);
			router.push('/dashboard');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Une erreur est survenue');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<main className="flex min-h-screen items-center justify-center">
			<form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4 p-6">
				<h1 className="text-2xl font-bold">Inscription</h1>

				{error && (
					<p className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>
				)}

				<label className="flex flex-col gap-1">
					<span className="text-sm">Nom</span>
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
						className="rounded border px-3 py-2"
					/>
				</label>

				<label className="flex flex-col gap-1">
					<span className="text-sm">Email</span>
					<input
						type="email"
						value={mail}
						onChange={(e) => setMail(e.target.value)}
						required
						className="rounded border px-3 py-2"
					/>
				</label>

				<label className="flex flex-col gap-1">
					<span className="text-sm">Mot de passe</span>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						className="rounded border px-3 py-2"
					/>
				</label>

				<button
					type="submit"
					disabled={submitting}
					className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
				>
					{submitting ? 'Création...' : "S'inscrire"}
				</button>

				<p className="text-sm">
					Déjà un compte ? <Link href="/login" className="underline">Connecte-toi</Link>
				</p>
			</form>
		</main>
	);
}
