import NoiseBackground from "./NoiseBackground";

export const BackgroundGradient = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
      {/* Base spectrum - smoother transitions with better color harmony */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              180deg,
              #0d0d12 0%,
              #1a1a2e 8%,
              #16213e 18%,
              #0f3460 32%,
              #2a5d9e 48%,
              #5b5fb8 62%,
              #9d4edd 75%,
              #d946a8 88%,
              #ff6b35 100%
            )
          `,
        }}
      />
      
      {/* Subtle top corners - softer blue glow */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 60% 50% at 10% 5%,
              rgba(100, 150, 255, 0.25) 0%,
              rgba(100, 150, 255, 0.08) 40%,
              transparent 70%
            ),
            radial-gradient(
              ellipse 60% 50% at 90% 5%,
              rgba(100, 150, 255, 0.25) 0%,
              rgba(100, 150, 255, 0.08) 40%,
              transparent 70%
            )
          `,
        }}
      />
      
      {/* Enhanced bottom blue accents - warmer integration */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 80% 65% at -15% 85%,
              rgba(93, 157, 255, 0.35) 0%,
              rgba(93, 157, 255, 0.15) 45%,
              transparent 70%
            ),
            radial-gradient(
              ellipse 80% 65% at 115% 85%,
              rgba(93, 157, 255, 0.35) 0%,
              rgba(93, 157, 255, 0.15) 45%,
              transparent 70%
            )
          `,
        }}
      />
      
      {/* Refined Gravity Core - more integrated, less harsh */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 95% 85% at 50% -8%,
              rgba(13, 13, 18, 0.92) 0%,
              rgba(13, 13, 18, 0.80) 22%,
              rgba(13, 13, 18, 0.50) 45%,
              rgba(13, 13, 18, 0.20) 68%,
              rgba(13, 13, 18, 0.04) 85%,
              transparent 95%
            )
          `,
        }}
      />
      
      {/* Smoother Gravity Feather - gentle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 130% 120% at 50% -5%,
              rgba(13, 13, 18, 0.15) 0%,
              rgba(13, 13, 18, 0.08) 35%,
              transparent 75%
            )
          `,
        }}
      />
      
      {/* Side vignette for more cohesion */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 150% 100% at 50% 50%,
              transparent 30%,
              rgba(13, 13, 18, 0.12) 75%,
              rgba(13, 13, 18, 0.25) 100%
            )
          `,
        }}
      />

      {/* Noise */}
      <NoiseBackground />
    </div>
  );
};