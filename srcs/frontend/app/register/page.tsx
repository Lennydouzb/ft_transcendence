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
			setError(err instanceof Error ? err.message : 'An error occurred');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<main className="flex min-h-screen items-center justify-center">
			<form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4 p-6">
				<h1 className="text-2xl font-bold">Sign up</h1>

				{error && (
					<p className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>
				)}

				<label className="flex flex-col gap-1">
					<span className="text-sm">Name</span>
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
						maxLength={16}
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
						maxLength={32}
						className="rounded border px-3 py-2"
					/>
				</label>

				<label className="flex flex-col gap-1">
					<span className="text-sm">Password</span>
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
					{submitting ? 'Creating...' : 'Sign up'}
				</button>

				<p className="text-sm">
					Already have an account? <Link href="/login" className="underline">Log in</Link>
				</p>
			</form>
		</main>
	);
}
