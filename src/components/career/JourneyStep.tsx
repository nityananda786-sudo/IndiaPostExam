import Image from "next/image";

interface Props {
  title: string;
  icon: string;
  last?: boolean;
}

export default function JourneyStep({
  title,
  icon,
  last = false,
}: Props) {
  return (
    <div className="relative flex items-center">

      {/* Connecting Line */}

      {!last && (
        <div className="absolute left-28 top-12 w-28 h-[3px] bg-red-600"></div>
      )}

      {/* Step */}

      <div className="relative z-10 flex flex-col items-center w-40">

        <div className="w-24 h-24 rounded-full bg-white border-2 border-red-600 shadow-xl flex items-center justify-center hover:scale-110 transition duration-300">

          <Image
            src={icon}
            alt={title}
            width={42}
            height={42}
          />

        </div>

        <h3 className="mt-5 text-center whitespace-pre-line font-semibold text-slate-800 leading-6">
          {title}
        </h3>

      </div>

    </div>
  );
}