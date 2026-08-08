import Image from "next/image";

export default function HeroRoad() {
  return (
    <Image
      src="/images/road.png"
      alt="Promotion Road"
      fill
      priority
      className="
        object-cover
        object-right
        scale-[1.18]
        brightness-105
      "
    />
  );
}