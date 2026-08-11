'use client';

import { useState, SubmitEvent } from 'react';
import { useChat } from '../context/ChatContext';

type ChatInputProps = {
	idUser: number;
};

export default function ChatInput({ idUser }: ChatInputProps) {
	const { sendMessage } = useChat();
	const [content, setContent] = useState('');

	function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		const trimmed = content.trim();
		if (!trimmed)
			return;
		sendMessage(idUser, trimmed);
		setContent('');
	}

	return (
		<form onSubmit={handleSubmit} className="flex gap-2 border-t p-3">
			<input
				type="text"
				value={content}
				onChange={(e) => setContent(e.target.value)}
				placeholder="Écris un message..."
				className="flex-1 rounded border px-3 py-2 text-sm"
			/>
			<button
				type="submit"
				disabled={!content.trim()}
				className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
			>
				Envoyer
			</button>
		</form>
	);
}
