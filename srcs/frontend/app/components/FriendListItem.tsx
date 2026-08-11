'use client';

import { useState } from 'react';
import { Friend } from '../types';

const IMAGE_BASE = 'http://localhost:8080/uploads';

type FriendListItemProps = {
	friend: Friend;
	selected: boolean;
	onSelect: (friend: Friend) => void;
};

export default function FriendListItem({ friend, selected, onSelect }: FriendListItemProps) {
	const [imageFailed, setImageFailed] = useState(false);
	const showImage = friend.profilePicture && !imageFailed;

	return (
		<button
			type="button"
			onClick={() => onSelect(friend)}
			className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left hover:bg-gray-100 ${
				selected ? 'bg-gray-200' : ''
			}`}
		>
			{showImage ? (
				<img
					src={`${IMAGE_BASE}/${friend.profilePicture}`}
					alt={friend.name}
					onError={() => setImageFailed(true)}
					className="h-9 w-9 rounded-full object-cover"
				/>
			) : (
				<span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
					{friend.name.charAt(0).toUpperCase()}
				</span>
			)}
			<span className="text-sm font-medium">{friend.name}</span>
		</button>
	);
}
