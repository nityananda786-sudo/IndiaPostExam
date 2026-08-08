const journey = [
  "GDS",
  "MTS",
  "Postman / Mail Guard",
  "Postal Assistant / Sorting Assistant",
  "Inspector Posts (LDCE)",
  "PS Group 'B'",
];

export default function CareerJourney() {
  return (
    <section className="bg-slate-50 py-24">

      <div className="max-w-5xl mx-auto px-6">

        <div className="text-center mb-20">

          <p className="uppercase tracking-[0.25em] text-red-600 font-semibold">
            India Post Promotion
          </p>

          <h2 className="mt-4 text-5xl font-bold text-slate-900">
            Your Career Journey
          </h2>

          <p className="mt-6 text-gray-600 text-lg">
            Every promotion begins with learning.
          </p>

        </div>

        <div className="flex flex-col items-center">

          {journey.map((step, index) => (

            <div
              key={step}
              className="flex flex-col items-center"
            >

              <div className="w-20 h-20 rounded-full bg-red-600 text-white flex items-center justify-center text-2xl font-bold shadow-xl">

                {index + 1}

              </div>

              <div className="mt-4 mb-8 text-center">

                <h3 className="font-bold text-xl text-slate-900">
                  {step}
                </h3>

              </div>

              {index !== journey.length - 1 && (

                <div className="w-1 h-14 bg-red-300 rounded-full"></div>

              )}

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}