import { ChatMessage } from '../context/ChatContext';

type ChatMessageItemProps = {
	message: ChatMessage;
};

export default function ChatMessageItem({ message }: ChatMessageItemProps) {
	const time = new Date(message.sendDate).toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
	});

	return (
		<div className={`flex flex-col ${message.fromMe ? 'items-end' : 'items-start'}`}>
			{!message.fromMe && message.senderName && (
				<span className="px-1 text-xs text-gray-500">{message.senderName}</span>
			)}
			<span
				className={`max-w-xs rounded-2xl px-3 py-2 text-sm ${
					message.fromMe ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'
				}`}
			>
				{message.content}
			</span>
			<span className="px-1 text-xs text-gray-400">{time}</span>
		</div>
	);
}
