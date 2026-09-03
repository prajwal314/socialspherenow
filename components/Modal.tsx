"use client";

import { type ReactNode, useEffect } from "react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
}

export default function Modal({
	isOpen,
	onClose,
	title,
	children,
}: ModalProps) {
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "unset";
		}
		return () => {
			document.body.style.overflow = "unset";
		};
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
			<button
				type="button"
				aria-label="Close modal"
				className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto touch-manipulation"
				onClick={onClose}
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
				className="relative glass-strong glass-shine rounded-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto pointer-events-auto z-[61]"
			>
				<div className="flex items-center justify-between p-4 border-b border-white/10">
					<h2 id="modal-title" className="text-lg font-semibold text-white">
						{title}
					</h2>
					<button
						type="button"
						aria-label="Close modal"
						onClick={onClose}
						className="text-white/50 hover:text-white text-2xl"
					>
						&times;
					</button>
				</div>
				<div className="p-4">{children}</div>
			</div>
		</div>
	);
}
