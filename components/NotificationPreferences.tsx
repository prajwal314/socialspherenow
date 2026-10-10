"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

interface Prefs {
	connectionRequest: boolean;
	connectionAccepted: boolean;
	newMessage: boolean;
	pendingReminder: boolean;
	welcome: boolean;
}

const DEFAULTS: Prefs = {
	connectionRequest: true,
	connectionAccepted: true,
	newMessage: true,
	pendingReminder: true,
	welcome: true,
};

const ROWS: Array<{
	key: keyof Prefs;
	title: string;
	description: string;
}> = [
	{
		key: "connectionRequest",
		title: "Connection requests",
		description: "Email me when someone wants to connect",
	},
	{
		key: "connectionAccepted",
		title: "Accepted connections",
		description: "Email me when my request is accepted",
	},
	{
		key: "newMessage",
		title: "New messages",
		description: "Digest email for unread messages (max ~1 per 30 min)",
	},
	{
		key: "pendingReminder",
		title: "Pending reminders",
		description: "One reminder if a request waits ~48 hours",
	},
	{
		key: "welcome",
		title: "Welcome email",
		description: "One-time email after account creation",
	},
];

export default function NotificationPreferences({
	workosId,
}: {
	workosId: string | undefined | null;
}) {
	const stored = useQuery(
		api.users.getNotificationPrefs,
		workosId ? { workosId } : "skip",
	) as Prefs | null | undefined;
	const updatePrefs = useMutation(api.users.updateNotificationPrefs);
	const [savingKey, setSavingKey] = useState<keyof Prefs | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (stored === null) setError(null);
	}, [stored]);

	if (!workosId) return null;

	const prefs: Prefs = { ...DEFAULTS, ...(stored ?? {}) };

	const toggle = async (key: keyof Prefs) => {
		if (!workosId || savingKey) return;
		setSavingKey(key);
		setError(null);
		try {
			await updatePrefs({ workosId, [key]: !prefs[key] });
		} catch (e) {
			console.error("Failed to update notification prefs:", e);
			setError("Could not save. Please try again.");
		} finally {
			setSavingKey(null);
		}
	};

	return (
		<div className="glass-card p-5 rounded-2xl border border-white/10">
			<div className="flex items-center gap-3 mb-1">
				<div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
					<span className="text-lg">🔔</span>
				</div>
				<div>
					<h2 className="font-semibold text-white">Email Notifications</h2>
					<p className="text-xs text-gray-500">
						Sent to your account email · enforced on the server
					</p>
				</div>
			</div>

			{stored === undefined ? (
				<div className="flex items-center justify-center py-6">
					<div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
				</div>
			) : (
				<div className="divide-y divide-white/5 mt-2">
					{ROWS.map((row) => {
						const on = prefs[row.key];
						return (
							<div key={row.key} className="flex items-center gap-3 py-3">
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-white">{row.title}</p>
									<p className="text-xs text-gray-500 mt-0.5">
										{row.description}
									</p>
								</div>
								<button
									type="button"
									role="switch"
									aria-checked={on}
									aria-label={row.title}
									disabled={savingKey !== null}
									onClick={() => toggle(row.key)}
									className={`relative w-11 h-6 rounded-full transition-colors shrink-0 touch-manipulation ${
										on ? "bg-[#0c8b96]" : "bg-white/10"
									} ${savingKey !== null ? "opacity-60" : ""}`}
								>
									<span
										className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
											on ? "left-[22px]" : "left-0.5"
										}`}
									/>
								</button>
							</div>
						);
					})}
				</div>
			)}
			{error && <p className="text-xs text-red-400 mt-2">{error}</p>}
		</div>
	);
}
