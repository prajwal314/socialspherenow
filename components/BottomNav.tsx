"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
	path: string;
	label: string;
	icon: React.ReactNode;
}

export default function BottomNav() {
	const pathname = usePathname();

	const navItems: NavItem[] = [
		{
			path: "/home",
			label: "Home",
			icon: (
				<svg
					className="w-6 h-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.5}
						d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
					/>
				</svg>
			),
		},
		{
			path: "/explore",
			label: "Explore",
			icon: (
				<svg
					className="w-6 h-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.5}
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
			),
		},
		{
			path: "/inbox",
			label: "Inbox",
			icon: (
				<svg
					className="w-6 h-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.5}
						d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
					/>
				</svg>
			),
		},
		{
			path: "/profile",
			label: "Profile",
			icon: (
				<svg
					className="w-6 h-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.5}
						d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
					/>
				</svg>
			),
		},
	];

	return (
		<nav className="fixed bottom-0 left-0 right-0 bg-[#161621]/95 backdrop-blur-md border-t border-white/10 z-50">
			<div className="flex justify-around items-center h-16 max-w-lg mx-auto">
				{navItems.map((item) => {
					const isActive = pathname === item.path;
					return (
						<Link
							key={item.path}
							href={item.path}
							className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200 ${
								isActive
									? "text-purple-400"
									: "text-gray-500 hover:text-gray-300"
							}`}
						>
							<div
								className={`${isActive ? "scale-110" : ""} transition-transform`}
							>
								{item.icon}
							</div>
							<span
								className={`text-xs mt-1 font-medium ${isActive ? "text-purple-400" : ""}`}
							>
								{item.label}
							</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
