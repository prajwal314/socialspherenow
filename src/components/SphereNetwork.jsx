import { useState, useEffect, useRef, useCallback } from 'react'

// Individual sphere with hover glow effect
function NetworkSphere({ id, x, y, size, color, onHover, isHovered, onPositionUpdate }) {
  const sphereRef = useRef(null)

  useEffect(() => {
    if (sphereRef.current) {
      onPositionUpdate(id, { x, y, size })
    }
  }, [id, x, y, size, onPositionUpdate])

  return (
    <div
      ref={sphereRef}
      className="absolute pointer-events-auto cursor-pointer transition-all duration-500 ease-out"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
      }}
      onMouseEnter={() => onHover(id, true)}
      onMouseLeave={() => onHover(id, false)}
    >
      {/* Outer glow */}
      <div
        className={`absolute inset-0 rounded-full ${color} blur-2xl transition-all duration-500 ease-out`}
        style={{
          opacity: isHovered ? 0.6 : 0.15,
          transform: isHovered ? 'scale(1.8)' : 'scale(1)',
        }}
      />
      {/* Middle glow */}
      <div
        className={`absolute inset-2 rounded-full ${color} blur-xl transition-all duration-500 ease-out`}
        style={{
          opacity: isHovered ? 0.5 : 0.2,
          transform: isHovered ? 'scale(1.5)' : 'scale(1)',
        }}
      />
      {/* Core */}
      <div
        className={`absolute inset-4 rounded-full ${color} blur-md transition-all duration-500 ease-out`}
        style={{
          opacity: isHovered ? 0.7 : 0.3,
          transform: isHovered ? 'scale(1.3)' : 'scale(1)',
        }}
      />
      {/* Bright center */}
      <div
        className={`absolute rounded-full ${color} transition-all duration-500 ease-out`}
        style={{
          inset: '35%',
          opacity: isHovered ? 0.9 : 0.4,
          filter: isHovered ? 'blur(4px)' : 'blur(6px)',
        }}
      />
    </div>
  )
}

// SVG lines connecting spheres
function ConnectionLines({ spherePositions, connections, hoveredSphere, containerRef }) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [containerRef])

  if (!dimensions.width || !dimensions.height) return null

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <defs>
        {/* Gradient for default lines */}
        <linearGradient id="lineGradientDefault" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#EC4899" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.1" />
        </linearGradient>
        {/* Gradient for highlighted lines */}
        <linearGradient id="lineGradientHover" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#EC4899" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {connections.map((conn, index) => {
        const from = spherePositions[conn.from]
        const to = spherePositions[conn.to]

        if (!from || !to) return null

        const x1 = (from.x / 100) * dimensions.width
        const y1 = (from.y / 100) * dimensions.height
        const x2 = (to.x / 100) * dimensions.width
        const y2 = (to.y / 100) * dimensions.height

        const isConnectedToHovered = hoveredSphere === conn.from || hoveredSphere === conn.to

        return (
          <line
            key={`${conn.from}-${conn.to}-${index}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isConnectedToHovered ? 'url(#lineGradientHover)' : 'url(#lineGradientDefault)'}
            strokeWidth={isConnectedToHovered ? 2 : 1}
            className="transition-all duration-500"
          />
        )
      })}
    </svg>
  )
}

export default function SphereNetwork() {
  const containerRef = useRef(null)
  const [hoveredSphere, setHoveredSphere] = useState(null)
  const [spherePositions, setSpherePositions] = useState({})

  // Define spheres with different sizes, positions, and colors
  // Positioned to create a beautiful network across the page
  const spheres = [
    // Large spheres
    { id: 'sphere-1', x: 8, y: 15, size: 120, color: 'bg-purple-500' },
    { id: 'sphere-2', x: 92, y: 25, size: 140, color: 'bg-cyan-500' },
    { id: 'sphere-3', x: 15, y: 55, size: 100, color: 'bg-pink-500' },
    { id: 'sphere-4', x: 88, y: 70, size: 130, color: 'bg-purple-600' },
    
    // Medium spheres
    { id: 'sphere-5', x: 25, y: 30, size: 80, color: 'bg-cyan-400' },
    { id: 'sphere-6', x: 75, y: 15, size: 70, color: 'bg-pink-400' },
    { id: 'sphere-7', x: 70, y: 45, size: 90, color: 'bg-purple-400' },
    { id: 'sphere-8', x: 30, y: 75, size: 85, color: 'bg-cyan-600' },
    { id: 'sphere-9', x: 60, y: 80, size: 75, color: 'bg-pink-600' },
    
    // Small spheres
    { id: 'sphere-10', x: 45, y: 20, size: 50, color: 'bg-purple-300' },
    { id: 'sphere-11', x: 50, y: 50, size: 60, color: 'bg-cyan-300' },
    { id: 'sphere-12', x: 40, y: 65, size: 55, color: 'bg-pink-300' },
    { id: 'sphere-13', x: 82, y: 50, size: 45, color: 'bg-purple-500' },
    { id: 'sphere-14', x: 12, y: 85, size: 65, color: 'bg-cyan-500' },
    { id: 'sphere-15', x: 95, y: 90, size: 50, color: 'bg-pink-500' },
  ]

  // Define connections between spheres - creating a network structure
  // Each sphere can connect to multiple others
  const connections = [
    // Main network backbone
    { from: 'sphere-1', to: 'sphere-5' },
    { from: 'sphere-5', to: 'sphere-10' },
    { from: 'sphere-10', to: 'sphere-6' },
    { from: 'sphere-6', to: 'sphere-2' },
    { from: 'sphere-2', to: 'sphere-7' },
    { from: 'sphere-7', to: 'sphere-13' },
    { from: 'sphere-13', to: 'sphere-4' },
    
    // Left side connections
    { from: 'sphere-1', to: 'sphere-3' },
    { from: 'sphere-3', to: 'sphere-8' },
    { from: 'sphere-8', to: 'sphere-14' },
    { from: 'sphere-5', to: 'sphere-3' },
    
    // Center connections
    { from: 'sphere-10', to: 'sphere-11' },
    { from: 'sphere-11', to: 'sphere-7' },
    { from: 'sphere-11', to: 'sphere-12' },
    { from: 'sphere-12', to: 'sphere-8' },
    { from: 'sphere-12', to: 'sphere-9' },
    
    // Right side connections
    { from: 'sphere-7', to: 'sphere-4' },
    { from: 'sphere-9', to: 'sphere-4' },
    { from: 'sphere-9', to: 'sphere-15' },
    { from: 'sphere-4', to: 'sphere-15' },
    
    // Cross connections for richness
    { from: 'sphere-5', to: 'sphere-11' },
    { from: 'sphere-6', to: 'sphere-7' },
    { from: 'sphere-3', to: 'sphere-12' },
    { from: 'sphere-8', to: 'sphere-9' },
    { from: 'sphere-14', to: 'sphere-9' },
    { from: 'sphere-2', to: 'sphere-13' },
  ]

  const handleHover = useCallback((id, isHovered) => {
    setHoveredSphere(isHovered ? id : null)
  }, [])

  const handlePositionUpdate = useCallback((id, position) => {
    setSpherePositions(prev => ({
      ...prev,
      [id]: position,
    }))
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {/* Connection lines */}
      <ConnectionLines
        spherePositions={spherePositions}
        connections={connections}
        hoveredSphere={hoveredSphere}
        containerRef={containerRef}
      />

      {/* Spheres */}
      <div className="absolute inset-0">
        {spheres.map((sphere) => (
          <NetworkSphere
            key={sphere.id}
            id={sphere.id}
            x={sphere.x}
            y={sphere.y}
            size={sphere.size}
            color={sphere.color}
            onHover={handleHover}
            isHovered={hoveredSphere === sphere.id}
            onPositionUpdate={handlePositionUpdate}
          />
        ))}
      </div>
    </div>
  )
}
