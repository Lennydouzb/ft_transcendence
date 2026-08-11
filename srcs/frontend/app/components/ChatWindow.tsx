'use client';

import { Friend } from '../types';
import { useChat } from '../context/ChatContext';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';

type ChatWindowProps = {
	friend: Friend;
};

export default function ChatWindow({ friend }: ChatWindowProps) {
	const { getMessages } = useChat();
	const messages = getMessages(friend.idUser);

	return (
		<div className="flex h-full flex-col">
			<div className="border-b px-4 py-3 font-semibold">{friend.name}</div>
			<ChatMessageList messages={messages} />
			<ChatInput idUser={friend.idUser} />
		</div>
	);
}
