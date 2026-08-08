import HeroBrand from "./HeroBrand";
import HeroRoad from "./HeroRoad";
import HeroPromotionRoad from "./HeroPromotionRoad";
import HeroPostman from "./HeroPostman";

export default function HeroRight() {
  return (
    <div
      className="
        relative
        w-full
        h-[620px]
        overflow-hidden
      "
    >
      {/* Road Background */}
      <div className="absolute inset-0 z-10">
        <HeroRoad />
      </div>

      {/* Warm Fade */}
      <div
        className="
          absolute
          inset-0
          z-15
          bg-gradient-to-r
          from-[#fff8ef]
          via-transparent
          to-[#fde7b2]/15
        "
      />

      {/* Left Fade */}
      <div
        className="
          absolute
          left-0
          top-0
          bottom-0
          w-40
          z-20
          bg-gradient-to-r
          from-[#fffaf5]
          to-transparent
        "
      />

      {/* Golden Light */}
      <div
        className="
          absolute
          inset-0
          z-25
          bg-gradient-to-r
          from-transparent
          via-transparent
          to-yellow-100/20
        "
      />

      {/* IndiaPostExam Logo */}
      <div
        className="
          absolute
          top-5
          left-8
          z-50
          scale-[1.55]
          origin-top-left
        "
      >
        <HeroBrand />
      </div>

      {/* Postman */}
      <div
        className="
          absolute
          bottom-[-2px]
          left-[85px]
          z-40
          w-[285px]
          xl:w-[295px]
          pointer-events-none
        "
      >
        <HeroPostman />
      </div>

      {/* Promotion Journey */}
      <div
        className="
          absolute
          top-[112px]
          right-[125px]
          z-70
        "
      >
        <HeroPromotionRoad />
      </div>
    </div>
  );
}