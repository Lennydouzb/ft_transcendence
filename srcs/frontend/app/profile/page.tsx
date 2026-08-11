'use client';

import { useEffect, useRef, useState, SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { fetchGetUser, fetchUpdateUserImage, fetchDeleteUserImage } from '../api/api';

const IMAGE_BASE = 'http://localhost:8080/uploads';

type UserProfile = {
	idUser: number;
	name: string;
	mail: string;
	profilePicture: string | null;
	scoreTotal: number;
};

export default function ProfilePage() {
	const { user, token, loading, isAuthenticated, updateName } = useAuth();
	const router = useRouter();

	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [profileLoading, setProfileLoading] = useState(true);

	const [name, setName] = useState('');
	const [savingName, setSavingName] = useState(false);
	const [nameMessage, setNameMessage] = useState<string | null>(null);

	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [imageError, setImageError] = useState<string | null>(null);
	const [imageFailed, setImageFailed] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!loading && !isAuthenticated)
			router.push('/login');
	}, [loading, isAuthenticated, router]);

	useEffect(() => {
		if (!user)
			return;
		fetchGetUser(user.idUser)
			.then((data: UserProfile[]) => {
				const found = data?.[0] ?? null;
				setProfile(found);
				if (found)
					setName(found.name);
			})
			.finally(() => setProfileLoading(false));
	}, [user]);

	async function handleNameSubmit(e: SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed)
			return;
		setSavingName(true);
		setNameMessage(null);
		try {
			await updateName(trimmed);
			setProfile((prev) => (prev ? { ...prev, name: trimmed } : prev));
			setNameMessage('Nom mis à jour.');
		} catch (err) {
			setNameMessage(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
		} finally {
			setSavingName(false);
		}
	}

	async function handleImageUpload() {
		if (!token || !selectedFile || !user)
			return;
		setUploading(true);
		setImageError(null);
		try {
			await fetchUpdateUserImage(selectedFile, token);
			const data: UserProfile[] = await fetchGetUser(user.idUser);
			setProfile(data?.[0] ?? null);
			setImageFailed(false);
			setSelectedFile(null);
			if (fileInputRef.current)
				fileInputRef.current.value = '';
		} catch (err) {
			setImageError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
		} finally {
			setUploading(false);
		}
	}

	async function handleImageDelete() {
		if (!token)
			return;
		setUploading(true);
		setImageError(null);
		try {
			await fetchDeleteUserImage(token);
			setProfile((prev) => (prev ? { ...prev, profilePicture: null } : prev));
		} catch (err) {
			setImageError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
		} finally {
			setUploading(false);
		}
	}

	if (loading || !isAuthenticated || profileLoading) {
		return (
			<main className="flex min-h-screen items-center justify-center">
				<p>Chargement...</p>
			</main>
		);
	}

	const showImage = profile?.profilePicture && !imageFailed;

	return (
		<main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
			<Link href="/dashboard" className="text-sm underline">
				&larr; Retour au dashboard
			</Link>

			<h1 className="text-2xl font-bold">Mon profil</h1>

			<section className="flex flex-col items-center gap-3">
				{showImage ? (
					<img
						src={`${IMAGE_BASE}/${profile!.profilePicture}`}
						alt={profile!.name}
						onError={() => setImageFailed(true)}
						className="h-24 w-24 rounded-full object-cover"
					/>
				) : (
					<span className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-3xl font-semibold text-white">
						{profile?.name.charAt(0).toUpperCase()}
					</span>
				)}

				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
					className="text-sm"
				/>

				<div className="flex gap-2">
					<button
						type="button"
						disabled={!selectedFile || uploading}
						onClick={handleImageUpload}
						className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
					>
						{uploading ? '...' : 'Changer la photo'}
					</button>
					{profile?.profilePicture && (
						<button
							type="button"
							disabled={uploading}
							onClick={handleImageDelete}
							className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
						>
							Retirer
						</button>
					)}
				</div>
				{imageError && <p className="text-xs text-red-600">{imageError}</p>}
			</section>

			<form onSubmit={handleNameSubmit} className="flex flex-col gap-2">
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
				<button
					type="submit"
					disabled={savingName}
					className="self-start rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
				>
					{savingName ? '...' : 'Enregistrer'}
				</button>
				{nameMessage && <p className="text-xs text-gray-500">{nameMessage}</p>}
			</form>

			<section className="text-sm text-gray-500">
				<p>Email : {profile?.mail}</p>
				<p>Score total : {profile?.scoreTotal ?? 0}</p>
			</section>
		</main>
	);
}
