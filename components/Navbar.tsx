"use client";

import Link from "next/link";

export default function Navbar() {
	return (
		<nav className="sticky top-0 z-50 bg-[#161621]/90 backdrop-blur-md border-b border-white/10">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16">
					<Link
						href="/home"
						className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent"
					>
						SocialSphere
					</Link>
					<div className="flex items-center space-x-4">
						{/* Additional nav items can go here */}
					</div>
				</div>
			</div>
		</nav>
	);
}
