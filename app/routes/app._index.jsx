import { useState } from "react";
import { redirect, Form, useLoaderData, Link, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  let shopRecord = await prisma.shop.findUnique({
    where: { shop: session.shop },
  });

  if (!shopRecord) {
    shopRecord = await prisma.shop.create({
      data: {
        shop: session.shop,
        isOnboarded: false,
      },
    });
  }

  // If onboarding is false, redirect to /app/onboarding
  if (!shopRecord.isOnboarded) {
    const searchParams = url.searchParams.toString();
    throw redirect(`/app/onboarding${searchParams ? `?${searchParams}` : ""}`);
  }

  return {
    shop: session.shop,
    isOnboarded: shopRecord.isOnboarded,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "reset_onboarding") {
    await prisma.shop.update({
      where: { shop: session.shop },
      data: { isOnboarded: false },
    });

    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    return redirect(`/app/onboarding${searchParams ? `?${searchParams}` : ""}`);
  }

  return null;
};

// SVG 4-Point Sparkle Star
function SparkleStar({ color = "#fbbf24", size = 18, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
        fill={color}
      />
    </svg>
  );
}

// Visual Preview: Colorful Confetti Sprinkles Burst
function ConfettiPreview() {
  return (
    <div className="flex items-center justify-center w-36 h-10 relative">
      <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] absolute top-2 left-3"></span>
      <span className="w-2.5 h-1 rounded bg-[#38bdf8] transform -rotate-45 absolute top-1 left-8"></span>
      <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] absolute top-5 left-6"></span>
      <span className="w-2 h-1 rounded bg-[#fbbf24] transform rotate-30 absolute top-2 left-14"></span>
      <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] absolute top-6 left-12"></span>
      <span className="w-2.5 h-1 rounded bg-[#f97316] transform -rotate-15 absolute top-3 left-20"></span>
      <span className="w-1.5 h-1.5 rounded-full bg-[#ec4899] absolute top-6 left-24"></span>
      <span className="w-2 h-1 rounded bg-[#38bdf8] transform rotate-45 absolute top-1 left-28"></span>
    </div>
  );
}

// Visual Preview: Pastel Hearts
function HeartsPreview() {
  return (
    <div className="flex items-center space-x-2 w-36 h-10 justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#f472b6" className="transform -rotate-12">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#c084fc">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#a78bfa" className="transform rotate-6">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="#7dd3fc" className="transform -rotate-6">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </div>
  );
}

// Visual Preview: Gold Sparkle Stars
function StarsPreview() {
  return (
    <div className="flex items-center space-x-2 w-36 h-10 justify-center">
      <SparkleStar color="#fbbf24" size={16} />
      <SparkleStar color="#f59e0b" size={24} />
      <SparkleStar color="#fbbf24" size={14} />
      <SparkleStar color="#f59e0b" size={20} />
    </div>
  );
}

export default function AppIndex() {
  const { shop } = useLoaderData();
  const [searchParams] = useSearchParams();
  const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : "";

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Sample default effects from screenshot
  const [effects, setEffects] = useState([
    {
      id: "1",
      name: "Order Celebration",
      subtitle: "A burst of colorful confetti",
      triggerEvent: "Order Placed",
      preview: <ConfettiPreview />,
      active: true,
    },
    {
      id: "2",
      name: "Welcome Visitors",
      subtitle: "A subtle welcome burst",
      triggerEvent: "Page Loaded",
      preview: <HeartsPreview />,
      active: false,
    },
    {
      id: "3",
      name: "Signup Success",
      subtitle: "Stars and sparkles",
      triggerEvent: "Customer Sign Up",
      preview: <StarsPreview />,
      active: true,
    },
  ]);

  // Toggle active status
  const toggleStatus = (id) => {
    setEffects((prev) =>
      prev.map((eff) =>
        eff.id === id ? { ...eff, active: !eff.active } : eff
      )
    );
  };

  // Filtered effects
  const filteredEffects = effects.filter(
    (eff) =>
      eff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eff.triggerEvent.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="min-h-screen w-full bg-[#f1f1f1] p-4 sm:p-6 md:p-8"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ========================================================= */}
        {/* 1. TOP HEADER                                             */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              Overview of your celebration effects
            </p>
          </div>

          {/* Analytics Button */}
          <button
            type="button"
            className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-2 flex items-center gap-2 text-slate-700 font-semibold text-sm shadow-sm transition-all duration-200 cursor-pointer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span>Analytics</span>
            <span className="text-slate-400 font-bold text-xs ml-0.5">›</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* 2. HERO BANNER ("CREATE MAGIC") - ACCURATE REPLICA        */}
        {/* ========================================================= */}
        <div
          className="relative border border-[#e9e3f8] rounded-[24px] p-6 sm:p-7 md:p-8 shadow-sm overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 92% 45%, rgba(216, 180, 254, 0.3) 0%, rgba(243, 232, 255, 0.1) 50%, transparent 75%), linear-gradient(105deg, #ffffff 0%, #faf8fe 35%, #f5effe 72%, #edf2fe 100%)",
            boxShadow:
              "0 4px 20px -2px rgba(109, 40, 217, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            {/* Left Content Column */}
            <div className="shrink-0 max-w-[420px]">
              <span className="text-[11px] font-bold text-[#6d28d9] tracking-[0.14em] uppercase block mb-1">
                CREATE MAGIC
              </span>
              <h2 className="text-[26px] sm:text-[30px] font-extrabold text-[#0f172a] tracking-tight leading-[1.18]">
                Add celebration to<br className="hidden sm:inline" />{" "}
                <span
                  style={{
                    background:
                      "linear-gradient(90deg, #d946ef 0%, #a855f7 32%, #4f46e5 68%, #38bdf8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  your store events
                </span>
              </h2>
              <p className="text-[13px] sm:text-[13.5px] text-slate-500 font-normal mt-2.5 leading-relaxed max-w-[390px]">
                Create a new confetti effect or choose from our pre-made library to get started.
              </p>
            </div>

            {/* Middle: Sparkle Stars Trio (between text and buttons) */}
            <div className="hidden lg:flex flex-col justify-between h-24 relative w-12 shrink-0 pointer-events-none select-none my-auto">
              <SparkleStar color="#a855f7" size={19} className="absolute -top-1 left-0" />
              <SparkleStar color="#2dd4bf" size={18} className="absolute top-7 left-5" />
              <SparkleStar color="#fbbf24" size={17} className="absolute bottom-0 left-1" />
            </div>

            {/* Right Section: Action Buttons + Floating Stars + Party Popper */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-3.5 shrink-0 relative">
              {/* + New effect Button */}
              <Link
                to={`/app/newEffect${queryStr}`}
                className="bg-[#4d319e] hover:bg-[#412788] active:scale-[0.98] text-white font-medium text-[13.5px] px-5 py-2.5 rounded-[13px] shadow-sm transition-all duration-150 cursor-pointer flex items-center gap-2 shrink-0 select-none"
                style={{
                  boxShadow: "0 4px 14px rgba(77, 49, 158, 0.22)",
                }}
              >
                <span className="text-base font-bold leading-none">+</span>
                <span>New effect</span>
              </Link>

              {/* Choose from pre-made library Button with Floating Stars */}
              <div className="relative shrink-0">
                {/* Gold star floating above the button */}
                <SparkleStar
                  color="#fbbf24"
                  size={18}
                  className="absolute -top-4 -right-1 pointer-events-none select-none"
                />

                {/* Purple star floating below the button near the popper cone */}
                <SparkleStar
                  color="#a855f7"
                  size={16}
                  className="absolute -bottom-4 right-1 pointer-events-none select-none"
                />

                <button
                  type="button"
                  className="bg-white hover:bg-[#faf8fe] active:scale-[0.98] border-[1.5px] border-[#d8ccfd] hover:border-[#c5b2fa] text-[#4d319e] font-medium text-[13.5px] px-4 sm:px-5 py-2.5 rounded-[13px] transition-all duration-150 cursor-pointer flex items-center gap-2.5 select-none"
                >
                  {/* 4-Square Grid Icon */}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="#4d319e"
                    className="shrink-0"
                  >
                    <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" />
                    <rect x="9.5" y="1" width="5.5" height="5.5" rx="1.5" />
                    <rect x="1" y="9.5" width="5.5" height="5.5" rx="1.5" />
                    <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1.5" />
                  </svg>
                  <span>Choose from pre-made library</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. "YOUR EFFECTS" TABLE CARD                              */}
        {/* ========================================================= */}
        <div
          className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm"
          style={{
            boxShadow:
              "0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
          }}
        >
          {/* Card Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Your effects
            </h3>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search effects..."
                className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50/90 hover:bg-slate-50 border border-slate-200/90 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-300 transition-all"
              />
            </div>
          </div>

          {/* Effects Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3.5 font-semibold">Name</th>
                  <th className="pb-3.5 font-semibold">Trigger Event</th>
                  <th className="pb-3.5 font-semibold text-center">
                    Style Preview
                  </th>
                  <th className="pb-3.5 font-semibold">Status</th>
                  <th className="pb-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEffects.length > 0 ? (
                  filteredEffects.map((eff) => (
                    <tr
                      key={eff.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Name Column */}
                      <td className="py-4 sm:py-5 pr-4">
                        <div className="font-bold text-slate-900 text-sm sm:text-[15px]">
                          {eff.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {eff.subtitle}
                        </div>
                      </td>

                      {/* Trigger Event Column */}
                      <td className="py-4 sm:py-5 pr-4 text-sm font-semibold text-slate-700">
                        {eff.triggerEvent}
                      </td>

                      {/* Style Preview Column */}
                      <td className="py-4 sm:py-5 text-center">
                        <div className="inline-flex items-center justify-center">
                          {eff.preview}
                        </div>
                      </td>

                      {/* Status Column (Toggle + Badge) */}
                      <td className="py-4 sm:py-5 pr-4">
                        <div className="flex items-center space-x-3">
                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => toggleStatus(eff.id)}
                            className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer shadow-inner flex items-center ${
                              eff.active
                                ? "bg-[#10b981] justify-end"
                                : "bg-slate-300 justify-start"
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-white shadow-sm block transition-transform"></span>
                          </button>

                          {/* Status Badge */}
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              eff.active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {eff.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-4 sm:py-5 text-right">
                        <button
                          type="button"
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors font-bold text-lg leading-none cursor-pointer tracking-widest inline-block"
                        >
                          •••
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-12 text-slate-400 text-sm"
                    >
                      No effects match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-6 mt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <span>Showing 1-3 of 3 effects</span>
            <span>
              Any issues?{" "}
              <a
                href="mailto:support@confettiflow.com"
                className="text-[#6366f1] hover:underline font-semibold"
              >
                Contact us.
              </a>
            </span>
          </div>
        </div>

        {/* Development & Testing Reset Control */}
        <div className="pt-2 flex justify-end">
          <Form method="post">
            <input type="hidden" name="intent" value="reset_onboarding" />
            <button
              type="submit"
              className="text-xs text-slate-400 hover:text-slate-600 font-medium underline transition-colors cursor-pointer"
            >
              Reset to Onboarding (Dev tool)
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}
