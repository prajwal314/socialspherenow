"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		let lastY = window.scrollY;
		const onScroll = () => {
			const y = window.scrollY;
			const scrollingDown = y > lastY;
			setVisible(!scrollingDown || y < 10);
			lastY = y;
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<nav
			className={`sticky top-0 z-50 glass-solid rounded-none border-b border-white/10 transition-transform duration-300 ${visible ? "translate-y-0" : "-translate-y-full"}`}
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-20">
					<Link href="/home" className="flex items-center gap-3">
						<Image
							src="/socialspherenow_logo.png"
							alt="SocialSphere logo"
							width={64}
							height={64}
							className="h-16 w-16 object-contain"
							priority
						/>
						<span className="text-4xl font-bold text-white">SocialSphere</span>
					</Link>
					<div className="flex items-center space-x-4">
						{/* Additional nav items can go here */}
					</div>
				</div>
			</div>
		</nav>
	);
}
