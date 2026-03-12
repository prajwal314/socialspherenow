"use client";

interface Community {
	_id?: string;
	name?: string;
	description?: string;
	memberCount?: number;
	imageUrl?: string;
	isJoined?: boolean;
}

interface CommunityCardProps {
	community: Community;
	onJoin?: (community: Community) => void;
}

export default function CommunityCard({
	community,
	onJoin,
}: CommunityCardProps) {
	const { name, description, memberCount, imageUrl, isJoined } = community;

	return (
		<div className="bg-white rounded-lg shadow-sm p-4">
			<div className="flex items-start">
				{imageUrl ? (
					<img
						src={imageUrl}
						alt={name ?? "Community"}
						className="w-12 h-12 rounded-lg object-cover"
					/>
				) : (
					<div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-xl">
						👥
					</div>
				)}
				<div className="flex-1 ml-3">
					<h3 className="font-semibold">{name ?? "Unnamed Community"}</h3>
					{description && (
						<p className="text-sm text-gray-500 line-clamp-2">{description}</p>
					)}
					{memberCount !== undefined && (
						<p className="text-xs text-gray-400 mt-1">{memberCount} members</p>
					)}
				</div>
				{onJoin && (
					<button
						type="button"
						onClick={() => onJoin(community)}
						className={`px-4 py-1.5 rounded-full text-sm font-medium ${
							isJoined ? "bg-gray-100 text-gray-600" : "bg-blue-600 text-white"
						}`}
					>
						{isJoined ? "Joined" : "Join"}
					</button>
				)}
			</div>
		</div>
	);
}
