"use client";
import dynamic from "next/dynamic";
const AnoAI = dynamic(() => import("@/components/ui/animated-shader-background"), { ssr: false, loading: () => null });
export default function LazyAnoAI() { return <AnoAI />; }
