"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

export interface Card {
  id: string | number;
  content: React.ReactNode;
  background?: string;
  image?: string;
}

export interface RotatingCardsProps {
  cards: Card[];
  radius?: number;
  duration?: number;
  cardWidth?: number;
  cardHeight?: number;
  pauseOnHover?: boolean;
  reverse?: boolean;
  draggable?: boolean;
  autoPlay?: boolean;
  onCardClick?: (card: Card, index: number) => void;
  mouseWheel?: boolean;
  className?: string;
  cardClassName?: string;
  initialRotation?: number;
  /** Show a circular track line through the cards */
  showTrackLine?: boolean;
  /** Radius offset for the track line (positive = bigger circle) */
  trackLineOffset?: number;
}

const RotatingCards: React.FC<RotatingCardsProps> = ({
  cards,
  radius = 360,
  duration = 20,
  cardWidth = 160,
  cardHeight = 190,
  pauseOnHover = true,
  reverse = false,
  draggable = false,
  autoPlay = true,
  onCardClick,
  mouseWheel = false,
  className = "",
  cardClassName = "",
  initialRotation = 0,
  showTrackLine = false,
  trackLineOffset = 25,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(initialRotation);
  const lastTimeRef = useRef<number | null>(null);
  const dragStartAngleRef = useRef(0);
  const dragStartRotationRef = useRef(0);

  const rotation = useMotionValue(initialRotation);
  const smoothRotation = useSpring(rotation, {
    damping: 30,
    stiffness: 200,
    mass: 0.5,
  });

  const cardPositions = useMemo(() => {
    const totalCards = cards.length;
    const angleStep = (2 * Math.PI) / totalCards;

    return cards.map((_, index) => {
      const angle = angleStep * index + (initialRotation * Math.PI) / 180;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      return {
        x,
        y,
        angle: (angle * 180) / Math.PI,
      };
    });
  }, [cards, radius, initialRotation]);

  // Track cards reference for preloading
  const cardsRef = useRef(cards);
  const hasImages = cards.some((card) => card.image);
  
  // Reset loaded when cards change
  if (cardsRef.current !== cards) {
    cardsRef.current = cards;
    if (!loaded) {
      // Already not loaded, no action needed
    } else if (hasImages) {
      // Will be set to false and then loaded after preload
    }
  }

  // Handle client-side mounting to prevent hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!hasImages) {
      setLoaded(true);
      return;
    }

    setLoaded(false);
    let cancelled = false;

    const preloadImages = async () => {
      const imagePromises = cards
        .filter((card) => card.image)
        .map((card) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = card.image!;
            img.onload = resolve;
            img.onerror = reject;
          });
        });

      try {
        await Promise.all(imagePromises);
      } catch (error) {
        console.error("Failed to load images", error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    preloadImages();

    return () => {
      cancelled = true;
    };
  }, [cards, hasImages]);

  useEffect(() => {
    let animationFrameId: number;
    lastTimeRef.current = null;

    const animate = (time: number) => {
      if (
        lastTimeRef.current !== null &&
        !isHovered &&
        !isDragging &&
        autoPlay &&
        loaded
      ) {
        const deltaTime = (time - lastTimeRef.current) / 1000;
        // Cap deltaTime to prevent huge jumps when returning from inactive tab
        const cappedDeltaTime = Math.min(deltaTime, 0.1);
        const degreesPerSecond = 360 / duration;
        const rotationDelta =
          degreesPerSecond * cappedDeltaTime * (reverse ? -1 : 1);

        rotationRef.current += rotationDelta;
        rotation.set(rotationRef.current);
      }

      lastTimeRef.current = time;
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [duration, reverse, isHovered, isDragging, autoPlay, rotation, loaded]);

  const getAngleFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return 0;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const angle = Math.atan2(clientY - centerY, clientX - centerX);
      return (angle * 180) / Math.PI;
    },
    [],
  );

  const handleDragStart = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent) => {
      setIsDragging(true);
      const clientX =
        "clientX" in event
          ? event.clientX
          : (event as TouchEvent).touches[0]?.clientX ?? 0;
      const clientY =
        "clientY" in event
          ? event.clientY
          : (event as TouchEvent).touches[0]?.clientY ?? 0;

      dragStartAngleRef.current = getAngleFromPointer(clientX, clientY);
      dragStartRotationRef.current = rotationRef.current;
    },
    [getAngleFromPointer],
  );

  const handleDrag = useCallback(
    (
      _event: MouseEvent | TouchEvent | PointerEvent,
      info: { point: { x: number; y: number } },
    ) => {
      if (!isDragging) return;

      const currentAngle = getAngleFromPointer(info.point.x, info.point.y);
      const angleDelta = currentAngle - dragStartAngleRef.current;
      const newRotation = dragStartRotationRef.current + angleDelta;

      rotationRef.current = newRotation;
      rotation.set(newRotation);
    },
    [isDragging, getAngleFromPointer, rotation],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!mouseWheel || !containerRef.current) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * 0.5;
      rotationRef.current += delta * (reverse ? -1 : 1);
      rotation.set(rotationRef.current);
    };

    const container = containerRef.current;
    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [mouseWheel, reverse, rotation]);

  const handleCardClick = useCallback(
    (card: Card, index: number) => {
      if (onCardClick) {
        onCardClick(card, index);
      }
    },
    [onCardClick],
  );

  const containerWidth = radius * 2 + cardWidth;
  const containerHeight = radius * 2 + cardHeight;

  const trackLineRadius = radius + trackLineOffset;

  return (
    <div
      ref={containerRef}
      className={cn("relative flex shrink-0 items-center justify-center", className)}
      style={{
        width: `${containerWidth}px`,
        height: `${containerHeight}px`,
      }}
    >
      {/* Track line circle */}
      {showTrackLine && (
        <svg
          className="pointer-events-none absolute inset-0"
          width="100%"
          height="100%"
          viewBox={`0 0 ${containerWidth} ${containerHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <circle
            cx={containerWidth / 2}
            cy={containerHeight / 2}
            r={trackLineRadius}
            fill="none"
            className="stroke-foreground/10"
            strokeWidth="1"
          />
        </svg>
      )}
      <motion.div
        key={cards.length}
        className="relative w-full h-full"
        style={{
          rotate: smoothRotation,
          willChange: "transform",
        }}
        drag={draggable}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      >
        {isMounted && cards.map((card, index) => {
          const position = cardPositions[index];
          if (!position) return null;

          return (
            <motion.div
              key={`${card.id}-${cards.length}`}
              className={cn(
                "absolute rounded-xl shadow-lg overflow-hidden cursor-pointer",
                "border border-foreground/10",
                "bg-background text-foreground",
                cardClassName,
              )}
              style={{
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                left: "50%",
                top: "50%",
                x: position.x,
                y: position.y,
                marginLeft: `-${cardWidth / 2}px`,
                marginTop: `-${cardHeight / 2}px`,
                background:
                  card.background ||
                  (card.image
                    ? `url(${card.image}) center/cover`
                    : undefined),
                willChange: "transform",
                rotate: position.angle + 90,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: loaded ? 1 : 0,
                scale: loaded ? 1 : 0,
              }}
              transition={{
                duration: 0.5,
                delay: index * 0.05,
                ease: "easeOut",
              }}
              onMouseEnter={() => pauseOnHover && setIsHovered(true)}
              onMouseLeave={() => pauseOnHover && setIsHovered(false)}
              onClick={() => handleCardClick(card, index)}
              {...(pauseOnHover
                ? {
                    whileHover: {
                      scale: 1.05,
                      transition: { duration: 0.2 },
                    },
                  }
                : {})}
            >
              <div className="w-full h-full">
                {card.content}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

RotatingCards.displayName = "RotatingCards";

export default RotatingCards;
