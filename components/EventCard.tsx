"use client";

interface Event {
	_id?: string;
	title?: string;
	date?: number;
	location?: string;
	imageUrl?: string;
	attendees?: number;
}

interface EventCardProps {
	event: Event;
}

export default function EventCard({ event }: EventCardProps) {
	const { title, date, location, imageUrl, attendees } = event || {};

	return (
		<div className="glass glass-shine rounded-2xl overflow-hidden">
			{imageUrl && (
				<img
					src={imageUrl}
					alt={title || "Event"}
					className="w-full h-40 object-cover"
				/>
			)}
			<div className="p-4">
				<h3 className="font-semibold text-lg mb-1 text-white">
					{title || "Untitled Event"}
				</h3>
				{date && (
					<p className="text-sm text-white/60 mb-1">
						{new Date(date).toLocaleDateString("en-US", {
							weekday: "short",
							month: "short",
							day: "numeric",
							hour: "numeric",
							minute: "2-digit",
						})}
					</p>
				)}
				{location && <p className="text-sm text-white/60 mb-2">{location}</p>}
				{attendees !== undefined && (
					<p className="text-sm text-white/80">{attendees} attending</p>
				)}
			</div>
		</div>
	);
}
