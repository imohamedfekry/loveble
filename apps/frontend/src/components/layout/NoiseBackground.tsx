const NoiseBackground = () => {
  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{
        mixBlendMode: "soft-light",
      }}
    >
      <filter id="noiseFilter">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="2"
          stitchTiles="stitch"
        />
      </filter>

      <rect
        width="100%"
        height="100%"
        filter="url(#noiseFilter)"
      />
    </svg>
  );
};

export default NoiseBackground;