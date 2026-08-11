'use client';

import { useGame } from '../context/GameContext';

export default function ClickGameButton() {
	const { visible, position, click } = useGame();

	if (!visible || !position)
		return null;

	return (
		<button
			type="button"
			onClick={click}
			style={{ position: 'fixed', left: position.x, top: position.y }}
			className="z-50 rounded-full bg-yellow-400 px-5 py-3 font-bold text-black shadow-lg hover:bg-yellow-300"
		>
			Clique-moi !
		</button>
	);
}
