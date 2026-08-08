export default function TrustBar() {
  const items = [
    {
      icon: "🏆",
      title: "Trusted by Thousands",
      subtitle: "of Aspirants",
    },
    {
      icon: "✓",
      title: "Quality Content",
      subtitle: "by Experts",
    },
    {
      icon: "◷",
      title: "Regular Updates",
      subtitle: "& Current Orders, Rules",
    },
    {
      icon: "✓",
      title: "Secure &",
      subtitle: "Ad-free Learning",
    },
  ];

  return (
    <div className="mx-auto mt-5 w-full max-w-[1260px] px-4">
      <div
        className="
          flex
          min-h-[72px]
          items-center
          justify-between
          rounded-2xl
          bg-[#102f63]
          px-12
          py-5
          shadow-[0_10px_30px_rgba(16,47,99,0.14)]
        "
      >
        {items.map((item, index) => (
          <div
            key={item.title}
            className={`
              flex
              flex-1
              items-center
              justify-center
              gap-3
              ${index !== 0 ? "border-l border-white/25" : ""}
            `}
          >
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-full
                text-[22px]
                text-[#f5b400]
              "
            >
              {item.icon}
            </div>

            <div className="leading-tight">
              <div className="text-[14px] font-semibold text-white">
                {item.title}
              </div>

              <div className="mt-0.5 text-[12px] text-white/80">
                {item.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}