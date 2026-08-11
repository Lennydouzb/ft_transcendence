'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from '../context/ChatContext';
import ChatMessageItem from './ChatMessageItem';

type ChatMessageListProps = {
	messages: ChatMessage[];
};

export default function ChatMessageList({ messages }: ChatMessageListProps) {
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages.length]);

	return (
		<div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
			{messages.map((message, index) => (
				<ChatMessageItem key={index} message={message} />
			))}
			<div ref={bottomRef} />
		</div>
	);
}
