'use client';

import { useGame } from '../context/GameContext';

export default function ClickGameButton() {
	const { visible, position, click, feedback } = useGame();

	return (
		<>
			{visible && position && (
				<button
					type="button"
					onClick={click}
					style={{ position: 'fixed', left: position.x, top: position.y }}
					className="z-50 rounded-full bg-yellow-400 px-5 py-3 font-bold text-black shadow-lg hover:bg-yellow-300"
				>
					Clique-moi !
				</button>
			)}
			{feedback && (
				<div
					key={feedback.id}
					style={{ position: 'fixed', left: feedback.position.x, top: feedback.position.y }}
					className={`z-50 pointer-events-none px-4 py-2 rounded-lg font-bold shadow-md animate-[fadeInOut_1.5s_ease-in-out] ${
						feedback.success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
					}`}
				>
					{feedback.message}
				</div>
			)}
		</>
	);
}
