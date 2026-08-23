import HeroLeft from "./HeroLeft";
import HeroRight from "./HeroRight";

export default function Hero() {
  return (
    <section
  className="
  relative
  overflow-hidden
  bg-[radial-gradient(circle_at_70%_30%,#fff4cf_0%,#fff8ea_32%,#fdfbf8_65%,#ffffff_100%)]
"
>
      {/* Left Glow */}
      <div
        className="
          absolute
          -left-52
          top-10
          h-[750px]
          w-[750px]
          rounded-full
          bg-orange-100/40
          blur-[170px]
          pointer-events-none
        "
      />

      {/* Right Golden Glow */}
      <div
        className="
          absolute
          -right-28
          top-0
          h-[700px]
          w-[700px]
          rounded-full
          bg-yellow-100/55
          blur-[180px]
          pointer-events-none
        "
      />

      {/* Center Warm Glow */}
      <div
        className="
          absolute
          left-1/2
          top-28
          -translate-x-1/2
          h-[450px]
          w-[450px]
          rounded-full
          bg-orange-50/40
          blur-[120px]
          pointer-events-none
        "
      />

      {/* Hero Container */}
      <div
        className="
          relative
          z-10
          max-w-[1450px]
          mx-auto
          px-8
          lg:px-12
          pt-20
          pb-10
        "
      >
        <div
          className="
            grid
           lg:grid-cols-[45%_55%]
            items-center
            gap-10
          "
        >
          {/* Left Side */}
          <div className="relative z-20">
            <HeroLeft />
          </div>

          {/* Right Side */}
          <div
            className="
              relative
              flex
              justify-end
              min-h-[620px]
            "
          >
            <HeroRight />
          </div>
        </div>
      </div>

      {/* Bottom Fade */}
      <div
        className="
          absolute
          bottom-0
          left-0
          right-0
          h-32
          bg-gradient-to-t
          from-white
          to-transparent
          pointer-events-none
        "
      />
    </section>
  );
}

{/* Left Warm Glow */}

<div
className="
absolute
left-[-250px]
top-0
w-[700px]
h-[700px]
rounded-full
bg-orange-100/35
blur-[180px]
pointer-events-none
"
/>

{/* Right Sun Glow */}

<div
className="
absolute
right-[-200px]
top-[-120px]
w-[850px]
h-[850px]
rounded-full
bg-yellow-100/60
blur-[220px]
pointer-events-none
"
/>

{/* Middle Warm Glow */}

<div
className="
absolute
left-1/2
top-20
-translate-x-1/2
w-[550px]
h-[550px]
rounded-full
bg-orange-50/30
blur-[150px]
pointer-events-none
"
/>