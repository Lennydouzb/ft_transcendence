'use client';

import { useGame } from '../context/GameContext';

export default function ScoreDisplay() {
	const { score } = useGame();

	if (score === null)
		return null;

	return (
		<div className="rounded bg-gray-100 px-3 py-1 text-sm font-medium">
			Score : {score}
		</div>
	);
}
