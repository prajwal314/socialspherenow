"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import {
	type ReactNode,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from "react";
import { BlackHoleHeroSection } from "@/components/ui/blackhole-hero-section";
import { useAuth } from "@/lib/auth-context";

interface SphereRefsType {
	[key: string]: HTMLDivElement | null;
}

interface LineType {
	id: string;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

// Component to render connecting strings between spheres
function ConnectingStrings({
	sphereRefs,
}: {
	sphereRefs: RefObject<SphereRefsType | null>;
}) {
	const [lines, setLines] = useState<LineType[]>([]);
	const svgRef = useRef<SVGSVGElement>(null);

	useEffect(() => {
		const updateLines = () => {
			const refs = sphereRefs.current;
			if (!refs) return;
			const ids = Object.keys(refs).filter((id) => refs[id]);

			if (ids.length < 2) return;

			const newLines: LineType[] = [];

			// Connect spheres in sequence
			for (let i = 0; i < ids.length - 1; i++) {
				const fromEl = refs[ids[i]];
				const toEl = refs[ids[i + 1]];

				if (fromEl && toEl) {
					const fromRect = fromEl.getBoundingClientRect();
					const toRect = toEl.getBoundingClientRect();

					newLines.push({
						id: `${ids[i]}-${ids[i + 1]}`,
						x1: fromRect.left + fromRect.width / 2,
						y1: fromRect.top + fromRect.height / 2 + window.scrollY,
						x2: toRect.left + toRect.width / 2,
						y2: toRect.top + toRect.height / 2 + window.scrollY,
					});
				}
			}

			setLines(newLines);
		};

		updateLines();

		window.addEventListener("scroll", updateLines);
		window.addEventListener("resize", updateLines);
		const interval = setInterval(updateLines, 100);

		return () => {
			window.removeEventListener("scroll", updateLines);
			window.removeEventListener("resize", updateLines);
			clearInterval(interval);
		};
	}, [sphereRefs]);

	return (
		<svg
			ref={svgRef}
			className="absolute top-0 left-0 w-full pointer-events-none z-0"
			style={{ height: "100%", minHeight: "100vh" }}
		>
			<defs>
				<linearGradient id="stringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15" />
					<stop offset="50%" stopColor="#db2777" stopOpacity="0.1" />
					<stop offset="100%" stopColor="#0891b2" stopOpacity="0.15" />
				</linearGradient>
			</defs>

			{lines.map((line) => (
				<line
					key={line.id}
					x1={line.x1}
					y1={line.y1}
					x2={line.x2}
					y2={line.y2}
					stroke="url(#stringGradient)"
					strokeWidth="1"
				/>
			))}
		</svg>
	);
}

// Animated blurred background sphere with hover effects
// Only glows when cursor is near the center
function AnimatedSphere({
	gradient,
	position = "right",
	onRef,
}: {
	gradient: string;
	position?: "right" | "left";
	onRef?: (el: HTMLDivElement) => void;
}) {
	const sphereRef = useRef<HTMLDivElement>(null);
	const [isNearCenter, setIsNearCenter] = useState(false);

	const positionClasses = {
		right: "right-0 lg:-right-20 xl:-right-32",
		left: "left-0 lg:-left-20 xl:-left-32",
	};

	useEffect(() => {
		if (sphereRef.current && onRef) {
			onRef(sphereRef.current);
		}
	}, [onRef]);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!sphereRef.current) return;

			const rect = sphereRef.current.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			const distance = Math.sqrt(
				(e.clientX - centerX) ** 2 + (e.clientY - centerY) ** 2,
			);

			const triggerRadius = rect.width * 0.35;
			setIsNearCenter(distance < triggerRadius);
		};

		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, []);

	return (
		<div
			ref={sphereRef}
			className={`absolute top-1/2 -translate-y-1/2 ${positionClasses[position]} w-64 h-64 lg:w-80 lg:h-80 xl:w-96 xl:h-96 pointer-events-none z-0`}
		>
			<div
				className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient} blur-3xl transition-all duration-700 ease-out`}
				style={{
					opacity: isNearCenter ? 0.5 : 0.2,
					transform: isNearCenter ? "scale(1.4)" : "scale(1)",
				}}
			/>
			<div
				className={`absolute inset-8 rounded-full bg-gradient-to-br ${gradient} blur-2xl transition-all duration-700 ease-out`}
				style={{
					opacity: isNearCenter ? 0.4 : 0.15,
					transform: isNearCenter ? "scale(1.3)" : "scale(1)",
				}}
			/>
			<div
				className={`absolute inset-16 rounded-full bg-gradient-to-br ${gradient} blur-xl transition-all duration-700 ease-out`}
				style={{
					opacity: isNearCenter ? 0.6 : 0.25,
					transform: isNearCenter ? "scale(1.2)" : "scale(1)",
				}}
			/>
		</div>
	);
}

interface Feature {
	title: string;
	description: string;
	icon: ReactNode;
}

interface Step {
	number: string;
	title: string;
	description: string;
}

export default function Onboarding() {
	const { user, isLoading } = useAuth();
	const isAuthenticated = !isLoading && !!user;
	const [navVisible, setNavVisible] = useState(true);

	useEffect(() => {
		let lastY = window.scrollY;
		const onScroll = () => {
			const y = window.scrollY;
			const scrollingDown = y > lastY;
			setNavVisible(!scrollingDown || y < 10);
			lastY = y;
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	// True while the viewport is narrow — drives the hero layout swap.
	const [narrow, setNarrow] = useState(false);
	useEffect(() => {
		const m = window.matchMedia("(max-width: 767px)");
		const sync = () => setNarrow(m.matches);
		sync();
		m.addEventListener("change", sync);
		return () => m.removeEventListener("change", sync);
	}, []);

	// Refs for all spheres to track positions for connecting strings
	const sphereRefs = useRef<SphereRefsType>({});

	const buttonHref = isAuthenticated ? "/home" : "/login";
	const buttonText = isAuthenticated ? "Go to Home" : "Login / Sign Up";

	// Register sphere ref
	const registerSphere = (id: string) => (el: HTMLDivElement) => {
		if (el) {
			sphereRefs.current[id] = el;
		}
	};

	// Feature sphere colors - alternating (purple, pink, cyan pattern from "comfort")
	// No same colors adjacent - using darker 600 shades
	const featureSphereColors = [
		"from-pink-600 to-purple-600",
		"from-cyan-600 to-blue-600",
		"from-purple-600 to-pink-600",
		"from-pink-600 to-cyan-600",
		"from-cyan-600 to-purple-600",
	];

	const features: Feature[] = [
		{
			title: "Find Activity Partners",
			description:
				"Looking for someone to grab coffee, watch a movie, go for dinner, or just hang out? SocialSphere lets you find people who want the same activity — without awkward conversations.",
			icon: (
				<svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
					<circle cx="24" cy="24" r="24" fill="url(#gradient1)" />
					<path
						d="M16 28c0-4.4 3.6-8 8-8s8 3.6 8 8"
						stroke="#fff"
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<circle cx="24" cy="16" r="4" fill="#fff" />
					<defs>
						<linearGradient id="gradient1" x1="0" y1="0" x2="48" y2="48">
							<stop stopColor="#8B5CF6" />
							<stop offset="1" stopColor="#06B6D4" />
						</linearGradient>
					</defs>
				</svg>
			),
		},
		{
			title: "Discover & Create Events",
			description:
				"See live events created by other users based on your interests. You can also create your own event, and it will appear in the feed of people who match your preferences.",
			icon: (
				<svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
					<circle cx="24" cy="24" r="24" fill="url(#gradient2)" />
					<rect
						x="14"
						y="16"
						width="20"
						height="18"
						rx="2"
						stroke="#fff"
						strokeWidth="2"
					/>
					<path
						d="M14 22h20M20 12v8M28 12v8"
						stroke="#fff"
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<defs>
						<linearGradient id="gradient2" x1="0" y1="0" x2="48" y2="48">
							<stop stopColor="#3B82F6" />
							<stop offset="1" stopColor="#8B5CF6" />
						</linearGradient>
					</defs>
				</svg>
			),
		},
		{
			title: "Join Like-Minded Communities",
			description:
				"Join communities based on shared interests. Participate in group chats, meet people slowly, and build connections at your own pace.",
			icon: (
				<svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
					<circle cx="24" cy="24" r="24" fill="url(#gradient3)" />
					<circle cx="24" cy="20" r="4" fill="#fff" />
					<circle cx="16" cy="26" r="3" fill="#fff" fillOpacity="0.7" />
					<circle cx="32" cy="26" r="3" fill="#fff" fillOpacity="0.7" />
					<path
						d="M14 36c0-5.5 4.5-10 10-10s10 4.5 10 10"
						stroke="#fff"
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<defs>
						<linearGradient id="gradient3" x1="0" y1="0" x2="48" y2="48">
							<stop stopColor="#06B6D4" />
							<stop offset="1" stopColor="#3B82F6" />
						</linearGradient>
					</defs>
				</svg>
			),
		},
		{
			title: "Comfort-First Connections",
			description:
				"No random DMs. No pressure. When someone wants to connect, you can accept when you feel ready. Chats only start after both users agree.",
			icon: (
				<svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
					<circle cx="24" cy="24" r="24" fill="url(#gradient4)" />
					<path
						d="M24 14l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8L24 14z"
						fill="#fff"
					/>
					<path
						d="M16 32c0-4.4 3.6-8 8-8s8 3.6 8 8"
						stroke="#fff"
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<defs>
						<linearGradient id="gradient4" x1="0" y1="0" x2="48" y2="48">
							<stop stopColor="#8B5CF6" />
							<stop offset="1" stopColor="#EC4899" />
						</linearGradient>
					</defs>
				</svg>
			),
		},
		{
			title: "Your Feed, Your Interests",
			description:
				"Everything you see — events, activities, communities — is personalized based on the preferences you choose after signup.",
			icon: (
				<svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
					<circle cx="24" cy="24" r="24" fill="url(#gradient5)" />
					<path
						d="M24 14v20M14 24h20"
						stroke="#fff"
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<circle cx="24" cy="24" r="6" stroke="#fff" strokeWidth="2" />
					<circle
						cx="24"
						cy="24"
						r="10"
						stroke="#fff"
						strokeWidth="1"
						strokeOpacity="0.5"
					/>
					<defs>
						<linearGradient id="gradient5" x1="0" y1="0" x2="48" y2="48">
							<stop stopColor="#06B6D4" />
							<stop offset="1" stopColor="#8B5CF6" />
						</linearGradient>
					</defs>
				</svg>
			),
		},
	];

	const steps: Step[] = [
		{
			number: "01",
			title: "Sign up & choose your interests",
			description: "Create your account and tell us what you love",
		},
		{
			number: "02",
			title: "Explore activities, events & communities",
			description: "Discover personalized content just for you",
		},
		{
			number: "03",
			title: "Connect only when it feels right",
			description: "No pressure, no random DMs — you're in control",
		},
	];

	return (
		<div className="min-h-screen bg-transparent text-white relative">
			{/* Connecting strings between spheres */}
			<ConnectingStrings sphereRefs={sphereRefs} />

			<nav
				className={`sticky top-0 z-50 bg-[#161621]/90 backdrop-blur-md border-b border-white/10 transition-transform duration-300 ${navVisible ? "translate-y-0" : "-translate-y-full"}`}
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-20">
						<span className="flex items-center gap-3">
							<Image
								src="/socialspherenow_logo.png"
								alt="SocialSphere logo"
								width={64}
								height={64}
								className="h-16 w-16 object-contain"
								priority
							/>
							<span className="text-4xl font-bold text-white">SocialSphere</span>
						</span>
						<Link
							href={buttonHref}
							className="px-5 py-2 rounded-full bg-[#0c8b96] text-white border border-white/20 font-medium text-sm hover:opacity-90 transition-opacity"
						>
							{buttonText}
						</Link>
					</div>
				</div>
			</nav>

			<section className="relative min-h-[92svh] w-full md:min-h-[720px]">
				<BlackHoleHeroSection
					focus={narrow ? [0.5, 0.72] : [0.74, 0.44]}
					scrim={narrow ? "top" : "left"}
					scrimStrength={0.9}
					distance={24}
					elevation={narrow ? -7 : -5.5}
					glow={narrow ? 0.85 : 1}
					steps={narrow ? 200 : 300}
					resolution={narrow ? 0.6 : 0.7}
				>
					<div className="flex h-full min-h-[92svh] items-start px-6 pt-16 sm:px-10 md:min-h-[720px] md:items-center md:pt-0 lg:px-20">
						<div className="max-w-[34rem]">
							<h1 className="text-[2.5rem] font-light leading-[1.05] tracking-[-0.03em] text-white sm:text-6xl lg:text-[4.25rem]">
								A social app built for{" "}
								<span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
									comfort
								</span>
								, not pressure.
							</h1>
							<p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-white/60 md:mt-7">
								SocialSphere helps you find the right people for activities,
								communities, and events — based on your interests and comfort
								level.
							</p>
							<div className="mt-8 flex flex-wrap items-center gap-3 md:mt-10">
								<Link
									href={buttonHref}
									className="rounded-full bg-[#0c8b96] px-6 py-3 text-sm font-medium text-white border border-white/20 transition hover:opacity-90"
								>
									Get Started
								</Link>
								<a
									href="#how-it-works"
									className="rounded-full border border-white/20 px-6 py-3 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
								>
									See how it works
								</a>
							</div>
						</div>
					</div>
				</BlackHoleHeroSection>
			</section>

			<section className="px-4 sm:px-6 lg:px-8 py-20 relative z-10">
				<div className="max-w-6xl mx-auto">
					<div className="text-center mb-16">
						<h2 className="text-3xl sm:text-4xl font-bold mb-4">
							Everything you need to{" "}
							<span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
								connect comfortably
							</span>
						</h2>
						<p className="text-gray-400 max-w-xl mx-auto">
							Designed for people who want meaningful connections without the
							social anxiety.
						</p>
					</div>

					<div className="space-y-12 lg:space-y-20">
						{features.map((feature, index) => (
							<div
								key={feature.title}
								className={`relative flex flex-col ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-8 lg:gap-16`}
							>
								{/* Background blurred sphere */}
								<AnimatedSphere
									gradient={featureSphereColors[index]}
									position={index % 2 === 0 ? "right" : "left"}
									onRef={registerSphere(`feature-${index}`)}
								/>

								<div className="flex-1 w-full relative z-10">
									<div className="relative p-8 rounded-3xl bg-[#1e1e2e]/80 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 group">
										<div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
										<div className="relative">
											<div className="mb-6 inline-block p-3 rounded-2xl bg-white/10">
												{feature.icon}
											</div>
											<h3 className="text-2xl font-bold mb-4">
												{feature.title}
											</h3>
											<p className="text-gray-300 leading-relaxed">
												{feature.description}
											</p>
										</div>
									</div>
								</div>

								{/* Empty flex item to maintain layout spacing */}
								<div className="flex-1 hidden lg:block" />
							</div>
						))}
					</div>
				</div>
			</section>

			<section
				id="how-it-works"
				className="scroll-mt-20 px-4 sm:px-6 lg:px-8 py-20 bg-white/5 relative z-10"
			>
				<div className="max-w-6xl mx-auto">
					<div className="text-center mb-16">
						<h2 className="text-3xl sm:text-4xl font-bold mb-4">
							How it{" "}
							<span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
								works
							</span>
						</h2>
						<p className="text-gray-400">
							Three simple steps to meaningful connections
						</p>
					</div>

					<div className="flex flex-col lg:flex-row gap-8">
						{steps.map((step, index) => (
							<div key={step.number} className="flex-1 relative">
								{index < steps.length - 1 && (
									<div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-purple-500/50 to-transparent -translate-x-1/2" />
								)}
								<div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 h-full">
									<span className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
										{step.number}
									</span>
									<h3 className="text-xl font-semibold mt-4 mb-2">
										{step.title}
									</h3>
									<p className="text-gray-400">{step.description}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			<section className="px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative z-10">
				<div className="relative w-full h-full">
					<div className="absolute inset-0 overflow-hidden">
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-r from-purple-500/30 to-cyan-500/30 rounded-full blur-3xl" />
					</div>
					<div className="relative max-w-4xl mx-auto text-center">
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-8">
							Social life shouldn&apos;t feel{" "}
							<span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
								difficult
							</span>
							.
						</h2>
						<Link
							href={buttonHref}
							className="group inline-flex items-center px-10 py-4 rounded-full bg-[#0c8b96] text-white border border-white/20 font-semibold text-lg hover:shadow-lg hover:shadow-gray-400/25 transition-all duration-300 hover:scale-105"
						>
							Join SocialSphere
							<span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">
								→
							</span>
						</Link>
					</div>
				</div>
			</section>

			<footer className="px-4 sm:px-6 lg:px-8 py-8 glass-solid rounded-none border-t border-white/10 relative z-10">
				<div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
					<span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent font-medium">
						SocialSphere
					</span>{" "}
					— Built for comfort, not pressure.
				</div>
			</footer>
		</div>
	);
}
