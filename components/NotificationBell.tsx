"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/auth-context";

interface PendingRequest {
	_id: Id<"requests">;
	senderId: string;
	senderName?: string;
	intent?: string;
	activity?: string;
}

export default function NotificationBell() {
	const { user } = useAuth();
	const [isOpen, setIsOpen] = useState(false);
	const [processingId, setProcessingId] = useState<Id<"requests"> | null>(
		null,
	);
	const containerRef = useRef<HTMLDivElement>(null);

	const pendingRequests = useQuery(
		api.requests.getPendingRequests,
		user?.id ? { receiverId: user.id } : "skip",
	) as PendingRequest[] | undefined | null;

	const acceptRequest = useMutation(api.requests.acceptRequest);
	const declineRequest = useMutation(api.requests.declineRequest);

	const count = pendingRequests?.length ?? 0;

	// Close on outside click / Escape
	useEffect(() => {
		if (!isOpen) return;
		const onPointerDown = (e: PointerEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		},
			onKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape") setIsOpen(false);
			};
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [isOpen]);

	const handleAccept = async (requestId: Id<"requests">) => {
		setProcessingId(requestId);
		try {
			await acceptRequest({ requestId });
		} catch (error) {
			console.error("Failed to accept request:", error);
		} finally {
			setProcessingId(null);
		}
	};

	const handleDecline = async (requestId: Id<"requests">) => {
		setProcessingId(requestId);
		try {
			await declineRequest({ requestId });
		} catch (error) {
			console.error("Failed to decline request:", error);
		} finally {
			setProcessingId(null);
		}
	};

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				onClick={() => setIsOpen((v) => !v)}
				aria-label={
					count > 0
						? `Notifications, ${count} pending connection requests`
						: "Notifications"
				}
				aria-expanded={isOpen}
				aria-haspopup="true"
				className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all touch-manipulation active:scale-95"
			>
				<svg
					className="w-5 h-5 text-gray-200"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.8}
						d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
					/>
				</svg>
				{count > 0 && (
					<span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-purple-500 text-white text-[11px] font-semibold flex items-center justify-center border-2 border-[#161621]">
						{count > 9 ? "9+" : count}
					</span>
				)}
				{count > 0 && (
					<span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-purple-500 animate-ping opacity-60 pointer-events-none" />
				)}
			</button>

			{isOpen && (
				<>
					<div
						className="fixed inset-0 z-40 bg-black/40 sm:bg-transparent sm:pointer-events-none"
						onClick={() => setIsOpen(false)}
						aria-hidden="true"
					/>
					<div className="fixed sm:absolute right-3 sm:right-0 left-3 sm:left-auto top-16 sm:top-full sm:mt-3 z-50 sm:w-[380px] max-h-[70vh] flex flex-col rounded-2xl border border-white/10 bg-[#161621]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
						<div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0">
							<div className="flex items-center gap-2">
								<h2 className="text-sm font-semibold text-white">
									Notifications
								</h2>
								{count > 0 && (
									<span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
										{count}
									</span>
								)}
							</div>
							<button
								type="button"
								onClick={() => setIsOpen(false)}
								aria-label="Close notifications"
								className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
							>
								<svg
									className="w-4 h-4 text-gray-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						<div className="overflow-y-auto p-3 space-y-3">
							{!pendingRequests ? (
								<div className="flex items-center justify-center py-10">
									<div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
								</div>
							) : pendingRequests.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-10 text-center px-4">
									<div className="w-12 h-12 mb-3 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
										<span className="text-xl">🔔</span>
									</div>
									<p className="text-gray-300 text-sm font-medium">
										You’re all caught up
									</p>
									<p className="text-gray-500 text-xs mt-1">
										New connection requests will appear here
									</p>
								</div>
							) : (
								<>
									<div className="flex items-center gap-2 px-1 pt-1">
										<div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
										<p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
											Connection Requests
										</p>
									</div>
									{pendingRequests.map((request) => {
										const isProcessing = processingId === request._id;
										return (
											<div
												key={request._id}
												className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20"
											>
												<div className="flex items-start gap-3">
													<div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-semibold shrink-0">
														{request.senderName?.charAt(0)?.toUpperCase() ||
															"?"}
													</div>
													<div className="flex-1 min-w-0">
														<p className="font-semibold text-white text-sm truncate">
															{request.senderName}
														</p>
														<p className="text-xs text-gray-400 mt-0.5">
															wants to connect for{" "}
															<span className="text-purple-300 capitalize">
																{request.intent || request.activity}
															</span>
														</p>
													</div>
												</div>
												<div className="flex gap-2 mt-3">
													<button
														type="button"
														onClick={() => handleAccept(request._id)}
														disabled={isProcessing}
														className="flex-1 px-3 py-2 rounded-xl bg-[#0c8b96] text-white border border-white/20 text-xs font-medium hover:shadow-lg transition-all disabled:opacity-60 touch-manipulation active:scale-[0.98]"
													>
														{isProcessing ? "Working..." : "Accept"}
													</button>
													<button
														type="button"
														onClick={() => handleDecline(request._id)}
														disabled={isProcessing}
														className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-medium hover:bg-white/10 transition-all disabled:opacity-60 touch-manipulation active:scale-[0.98]"
													>
														Decline
													</button>
												</div>
											</div>
										);
									})}
								</>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
