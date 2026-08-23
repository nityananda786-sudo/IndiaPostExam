import Image from "next/image";

export default function HeroPostman() {
  return (
    <Image
      src="/images/postman.png"
      alt="India Post Postman"
      width={600}
      height={900}
      priority
      className="
        w-full
        h-auto
        object-contain
        select-none
        drop-shadow-[0_18px_40px_rgba(0,0,0,0.28)]
      "
    />
  );
}