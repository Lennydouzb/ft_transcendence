'use client';

import { useState } from 'react';
import { Friend } from '../types';

const IMAGE_BASE = '/uploads';

type FriendListItemProps = {
	friend: Friend;
	selected: boolean;
	onSelect: (friend: Friend) => void;
	onRemove: (idUser: number) => void;
	removing: boolean;
};

export default function FriendListItem({ friend, selected, onSelect, onRemove, removing }: FriendListItemProps) {
	const [imageFailed, setImageFailed] = useState(false);
	const showImage = friend.profilePicture && !imageFailed;

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={() => onSelect(friend)}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ')
					onSelect(friend);
			}}
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
			<span className="flex-1 text-sm font-medium">{friend.name}</span>
			<button
				type="button"
				disabled={removing}
				onClick={(e) => {
					e.stopPropagation();
					onRemove(friend.idUser);
				}}
				className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50"
			>
				{removing ? '...' : 'Remove'}
			</button>
		</div>
	);
}
