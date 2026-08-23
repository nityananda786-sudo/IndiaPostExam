import Image from "next/image";

export default function HeroBrand() {
  return (
    <Image
      src="/images/indiapost-logo.png"
      alt="India Post"
      width={200}
      height={200}
      priority
      className="
        object-contain
        opacity-90
        drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]
      "
    />
  );
}