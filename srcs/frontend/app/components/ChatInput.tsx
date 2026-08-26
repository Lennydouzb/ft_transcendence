'use client';

import { useState, SubmitEvent } from 'react';
import { useChat } from '../context/ChatContext';

type ChatInputProps = {
	idUser: number;
};

const MAX_LENGTH = 100;

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
		<form onSubmit={handleSubmit} className="flex flex-col gap-1 border-t p-3">
			<div className="flex gap-2">
				<input
					type="text"
					value={content}
					onChange={(e) => setContent(e.target.value)}
					maxLength={MAX_LENGTH}
					placeholder="Write a message..."
					className="min-w-0 flex-1 rounded border px-3 py-2 text-sm"
				/>
				<button
					type="submit"
					disabled={!content.trim()}
					className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
				>
					Send
				</button>
			</div>
			<span className="self-end text-xs text-gray-400">
				{content.length}/{MAX_LENGTH}
			</span>
		</form>
	);
}
