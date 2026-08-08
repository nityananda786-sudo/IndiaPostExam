"use client";

import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { navigation } from "@/constants/navigation";

export default function Navbar() {
  return (
    <header className="w-full bg-white border-b border-gray-200">
      <div
        className="
          mx-auto
          flex
          min-h-[92px]
          w-full
          max-w-[1450px]
          items-center
          justify-between
          px-5
          sm:px-8
          lg:px-12
          xl:px-16
        "
      >
        {/* =========================
            LOGO
        ========================== */}
        {/* Logo */}
<Link
  href="/"
  className="flex shrink-0 items-center"
>
  <Image
    src="/logo/logo.png"
    alt={siteConfig.name}
    width={350}
    height={90}
    priority
    className="
      h-[72px]
      w-auto
      object-contain
      sm:h-[78px]
      lg:h-[84px]
      xl:h-[88px]
    "
  />
</Link>
        {/* =========================
    NAVIGATION
========================= */}
<nav className="hidden lg:flex items-center gap-1 xl:gap-2">
  {navigation.map((item) => {
    const colors: Record<string, string> = {
      Home:
        "text-red-600 hover:bg-red-50 hover:text-red-700",

      Courses:
        "text-blue-700 hover:bg-blue-50 hover:text-blue-800",

      Blog:
        "text-purple-700 hover:bg-purple-50 hover:text-purple-800",

      eBookStore:
        "text-amber-700 hover:bg-amber-50 hover:text-amber-800",

      Contact:
        "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800",
    };

    return (
      <Link
        key={item.name}
        href={item.href}
        className={`
          rounded-lg
          px-3
          py-2
          xl:px-4
          xl:py-2.5
          whitespace-nowrap
          text-[15px]
          xl:text-[16px]
          font-bold
          transition-all
          duration-200
          hover:-translate-y-[1px]
          hover:shadow-sm
          ${colors[item.name] ?? "text-slate-700"}
        `}
      >
        {item.name}
      </Link>
    );
  })}
</nav>

{/* =========================
    ACTION BUTTONS
========================= */}
<div className="hidden lg:flex items-center gap-2 xl:gap-3">

  {/* Login */}
  <Link
    href="/login"
    className="
      inline-flex
      items-center
      justify-center
      rounded-xl
      border-2
      border-red-500
      bg-red-50
      px-5
      py-2.5
      xl:px-6
      xl:py-3
      text-[15px]
      xl:text-[16px]
      font-bold
      text-red-600
      whitespace-nowrap
      transition-all
      duration-200
      hover:-translate-y-[1px]
      hover:bg-red-100
      hover:border-red-600
      hover:shadow-md
      active:translate-y-0
    "
  >
    Login
  </Link>

  {/* Subscribe */}
  <Link
    href="/subscribe"
    className="
      inline-flex
      items-center
      justify-center
      rounded-xl
      border-2
      border-red-600
      bg-gradient-to-r
      from-red-600
      to-red-500
      px-5
      py-2.5
      xl:px-6
      xl:py-3
      text-[15px]
      xl:text-[16px]
      font-bold
      text-white
      whitespace-nowrap
      shadow-sm
      transition-all
      duration-200
      hover:-translate-y-[1px]
      hover:from-red-700
      hover:to-red-600
      hover:shadow-lg
      active:translate-y-0
    "
  >
    Subscribe
  </Link>

</div>

        {/* =========================
            MOBILE MENU BUTTON
        ========================== */}
        <button
          type="button"
          aria-label="Open menu"
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-lg
            border
            border-gray-200
            text-slate-700
            lg:hidden
          "
        >
          <span className="text-xl">☰</span>
        </button>
      </div>
    </header>
  );
}