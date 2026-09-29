import { Link, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

const PREMADE_EFFECTS = [
  {
    id: "christmas",
    title: "Christmas",
    description: "Triggers during your Christmas sale window",
    image: "/Gemini_Generated_Image_baugy0baugy0baug-1.webp",
  },
  {
    id: "black-friday",
    title: "Black Friday",
    description: "Triggers when a Black Friday discount is applied",
    image: "/Gemini_Generated_Image_baugy0baugy0baug-2.webp",
  },
  {
    id: "diwali",
    title: "Diwali",
    description: "Triggers during your Diwali collection sale",
    image: "/Gemini_Generated_Image_baugy0baugy0baug-4.webp",
  },
  {
    id: "new-year",
    title: "New Year",
    description: "Triggers on orders placed on New Year's",
    image: "/Gemini_Generated_Image_baugy0baugy0baug-3.webp",
  },
  {
    id: "sale",
    title: "Sale",
    description: "Triggers whenever any discount code is used",
    image: "/Gemini_Generated_Image_baugy0baugy0baug-5.webp",
  },
  {
    id: "anniversary",
    title: "Anniversary",
    description: "Triggers on a customer's store anniversary",
    image: "/Gemini_Generated_Image_baugy0baugy0baug-6.webp",
  },
];

export default function PremadeLibraryPage() {
  const [searchParams] = useSearchParams();
  const cleanParams = new URLSearchParams(searchParams);
  cleanParams.delete("id");
  cleanParams.delete("effectId");
  const queryStr = cleanParams.toString() ? `?${cleanParams.toString()}` : "";

  return (
    <div
      className="min-h-screen w-full bg-[#f1f1f1] p-4 sm:p-6 md:p-8"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── Top Navigation & Header ── */}
        <div>
          {/* Back to dashboard button */}
          <Link
            to={`/app${queryStr}`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-3 group"
            style={{ textDecoration: "none" }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:-translate-x-0.5"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to dashboard</span>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
            Premade library
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1">
            Ready made effects for common moments. Pick one, tweak a few things, and go live.
          </p>
        </div>

        {/* ── 6 Cards Grid (3 Columns on desktop, 2 on tablet, 1 on mobile) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PREMADE_EFFECTS.map((eff) => (
            <div
              key={eff.id}
              className="bg-white rounded-[24px] p-4 sm:p-5 border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.08)] transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Visual Preview Box */}
                <div className="w-full h-44 sm:h-48 rounded-[18px] overflow-hidden bg-slate-50 flex items-center justify-center relative">
                  <img
                    src={eff.image}
                    alt={eff.title}
                    className="w-full h-full object-cover rounded-[18px]"
                    loading="eager"
                    decoding="async"
                  />
                </div>

                {/* Card Title & Description */}
                <h3 className="text-base font-bold text-[#0f172a] mt-4 tracking-tight">
                  {eff.title}
                </h3>
                <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed min-h-[34px]">
                  {eff.description}
                </p>
              </div>

              {/* Action Button: Use this effect */}
              <Link
                to={`/app/preMadeEditEffect?template=${eff.id}${queryStr ? `&${queryStr.slice(1)}` : ""}`}
                className="w-full mt-4 py-2.5 px-4 rounded-[14px] bg-[#f5effe] hover:bg-[#ede5fd] active:scale-[0.98] text-[#6d28d9] font-bold text-xs flex items-center justify-center gap-2 border border-[#d8b4fe]/40 shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer"
                style={{ textDecoration: "none" }}
              >
                {/* 4-point sparkle star icon matching wireframe */}
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="shrink-0"
                >
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
                <span>Use this effect</span>
              </Link>
            </div>
          ))}
        </div>

        {/* ── Table / Library Footer Bar with Pagination ── */}
        <div className="bg-white rounded-[20px] border border-slate-200/90 px-6 py-4 flex items-center justify-between shadow-xs">
          <span className="text-xs sm:text-sm font-semibold text-slate-700">
            Showing 1–6 of 6 effects
          </span>

          {/* Pagination Controls matching wireframe */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-bold border border-slate-200/60 cursor-not-allowed select-none"
              title="Previous page"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              type="button"
              className="w-8 h-8 rounded-lg bg-[#f5effe] text-[#6d28d9] flex items-center justify-center text-xs font-bold border border-[#e9d5ff] cursor-pointer select-none"
            >
              1
            </button>

            <button
              type="button"
              disabled
              className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-bold border border-slate-200/60 cursor-not-allowed select-none"
              title="Next page"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
