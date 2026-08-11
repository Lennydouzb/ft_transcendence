'use client';

import Link from 'next/link';
import { useGame } from '../context/GameContext';

export default function ScoreDisplay() {
	const { score } = useGame();

	if (score === null)
		return null;

	return (
		<Link
			href="/score"
			className="rounded bg-gray-100 px-3 py-1 text-sm font-medium hover:bg-gray-200"
		>
			Score : {score}
		</Link>
	);
}
