import Image from "next/image";

const steps = [
  {
    title: "PSS Group 'B'",
    icon: "/icons/psb.svg",
    top: 20,
    left: 90,
    size: 28,
    text: "text-xs",
  },
  {
    title: "Inspector Posts",
    icon: "/icons/inspector.svg",
    top: 72,
    left: 52,
    size: 32,
    text: "text-sm",
  },
  {
    title: "Postal Assistant",
    icon: "/icons/pa.svg",
    top: 138,
    left: 82,
    size: 36,
    text: "text-sm",
  },
  {
    title: "Postman",
    icon: "/icons/postman.svg",
    top: 214,
    left: 128,
    size: 42,
    text: "text-base",
  },
  {
    title: "MTS",
    icon: "/icons/mts.svg",
    top: 298,
    left: 95,
    size: 48,
    text: "text-base",
  },
  {
    title: "GDS",
    icon: "/icons/gds.svg",
    top: 390,
    left: 145,
    size: 54,
    text: "text-lg",
  },
];

export default function HeroPromotionRoad() {
  return (
    <div className="relative w-[300px] h-[470px]">
      {steps.map((step) => (
        <div
          key={step.title}
          className="absolute flex items-center gap-3"
          style={{
            top: step.top,
            left: step.left,
          }}
        >
          {/* Icon */}
          <div
            className="
              rounded-full
              bg-gradient-to-br
              from-red-600
              via-red-700
              to-red-800
              border-2
              border-white
              shadow-xl
              flex
              items-center
              justify-center
              shrink-0
            "
            style={{
              width: step.size,
              height: step.size,
            }}
          >
            <img
  src={step.icon}
  alt={step.title}
  width="18"
  height="18"
  style={{
    filter: "invert(1)",
  }}
/>
          </div>

          {/* Label */}
          <span
            className={`
              ${step.text}
              font-semibold
              text-yellow-100
              bg-black/50
              backdrop-blur-md
              px-3
              py-1
              rounded-full
              border
              border-yellow-300/20
              shadow-lg
              whitespace-nowrap
            `}
          >
            {step.title}
          </span>
        </div>
      ))}
    </div>
  );
}