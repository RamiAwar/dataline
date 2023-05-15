import { useState, useEffect, useRef } from "react";

export const BackgroundLayout = () => {
  const circleSize = 300;
  const [circlePosition, setCirclePosition] = useState({ x: 0, y: 0 });
  const targetPosition = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null);

  const handleMouseMove = (event: { clientX: any; clientY: any }) => {
    targetPosition.current = { x: event.clientX, y: event.clientY };
  };

  useEffect(() => {
    const updatePosition = () => {
      const { x, y } = circlePosition;
      const { x: targetX, y: targetY } = targetPosition.current;
      const delay = 0.08;
      const newX = x + (targetX - x) * delay;
      const newY = y + (targetY - y) * delay;

      setCirclePosition({ x: newX, y: newY });

      animationFrameId.current = requestAnimationFrame(updatePosition);
    };

    animationFrameId.current = requestAnimationFrame(updatePosition);
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animationFrameId.current as number);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [circlePosition]);

  const circleStyle = {
    top: `${circlePosition.y - circleSize / 2}px`,
    left: `${circlePosition.x - circleSize / 2}px`,
  };

  return (
    <div className="">
      <div className="relative">
        <svg
          className="absolute pointer-events-none -z-10 transform-gpu blur-7xl opacity-20"
          style={circleStyle}
          width={circleSize}
          height={circleSize}
        >
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={circleSize / 2}
            fill="#FFEA80"
          />
        </svg>
      </div>
      <svg
        className="absolute inset-0 -z-10 h-full w-full stroke-white/10 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="983e3e4c-de6d-4c3f-8d64-b9761d1534cc"
            width={200}
            height={200}
            x="50%"
            y={-1}
            patternUnits="userSpaceOnUse"
          >
            <path d="M.5 200V.5H200" fill="none" />
          </pattern>
        </defs>
        <svg x="50%" y={-1} className="overflow-visible fill-gray-800/20">
          <path
            d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
            strokeWidth={0}
          />
        </svg>
        <rect
          width="100%"
          height="100%"
          strokeWidth={0}
          fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)"
        />
      </svg>
      <div
        className="absolute left-[calc(50%-4rem)] top-10 -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:left-48 lg:top-[calc(50%-30rem)] xl:left-[calc(50%-24rem)]"
        aria-hidden="true"
      >
        <div
          className="complex-animation aspect-[1108/632] w-[69.25rem] bg-gradient-to-r from-[#80caff] to-[#4f46e5] opacity-20"
          style={{
            clipPath:
              "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
          }}
        />
      </div>
    </div>
  );
};
