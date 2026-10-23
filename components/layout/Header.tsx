"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation"; 
import { AiOutlineMenu, AiOutlineClose } from "react-icons/ai";
import { useTheme } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Header = () => {
  const [nav, setNav] = useState(false);
  const [color, setColor] = useState("transparent");
  const [textColor, setTextColor] = useState("white");
  const { resolvedTheme } = useTheme();

  const pathname = usePathname(); 

  const isActive = (path: string) => {
    if (path === "/#about-ksa") return pathname === "/";
    return pathname === path;
  };

  const handleNav = () => {
    setNav(!nav);
  };

  useEffect(() => {
    const isDark = resolvedTheme === "dark";
    const scrolledBg = isDark ? "#1C231E" : "#ffffff";
    const scrolledText = isDark ? "#edf2ec" : "#000000";
    
    if (pathname === "/") {
      const changeColor = () => {
        if (window.scrollY >= 90) {
          setColor(scrolledBg);
          setTextColor(scrolledText);
        } else {
          setColor("transparent");
          setTextColor("#ffffff");
        }
      };
      
      changeColor(); 
      window.addEventListener("scroll", changeColor);
      

      return () => window.removeEventListener("scroll", changeColor);
    } else {

      setColor(scrolledBg);
      setTextColor(scrolledText);
    }
  }, [pathname, resolvedTheme]); 

  return (
    <div
      style={{ backgroundColor: `${color}` }}
      className="fixed left-0 top-0 w-full z-[999] ease-in duration-300"
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-2">
        <Link href="/" className="flex items-center">
          <div className="flex items-center">
            <Image
              src="/images/logo.png"
              width={40}
              height={40}
              alt="Logo Pare Hurip"
            />
            <div
              className="hidden sm:block ml-3 text-center text-sm tracking-[2.5px]"
              style={{ color: `${textColor}` }}
            >
              <h2 className="font-bold">PARE</h2>
              <h2 className="font-bold">HURIP 2.0</h2>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation + theme toggle */}
        <div className="flex items-center gap-2">
          <ul
            style={{ color: `${textColor}` }}
            className="hidden sm:flex font-semibold space-x-4 items-center"
          >
            {/* Use section IDs for navigation on the home page */}
            <li className="p-2 hover:text-green-600 transition-colors duration-200">
              <Link
                href="/#about-ksa"
                className={`border-b-2 pb-1 transition-all duration-200 ${
                  isActive("/#about-ksa")
                    ? "border-green-600"
                    : "border-transparent"
                }`}
              >
                Beranda
              </Link>
            </li>
            <li className="p-2 hover:text-green-600 transition-colors duration-200">
              <Link
                href="/ksa-visualization"
                className={`border-b-2 pb-1 transition-all duration-200 ${
                  isActive("/ksa-visualization")
                    ? "border-green-600"
                    : "border-transparent"
                }`}
              >
                Fase Tanam
              </Link>
            </li>
            <li className="p-2 hover:text-green-600 transition-colors duration-200">
              <Link
                href="/compare"
                className={`border-b-2 pb-1 transition-all duration-200 ${
                  isActive("/compare") ? "border-green-600" : "border-transparent"
                }`}
              >
                Harga Beras
              </Link>
            </li>
          </ul>

          <ThemeToggle />
          <div className="sm:hidden z-20 p-2" onClick={handleNav}>
            {nav ? (
              <AiOutlineClose size={28} style={{ color: textColor }} />
            ) : (
              <AiOutlineMenu size={28} style={{ color: textColor }} />
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`sm:hidden absolute top-0 left-0 w-full h-screen bg-black text-white flex justify-center items-center transition-transform duration-300 ease-in-out ${
            nav ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <ul className="space-y-8 text-center text-2xl font-bold">
            <li onClick={handleNav}>
              <Link
                href="/#about-ksa"
                className={`border-b-2 pb-1 transition-all duration-200 ${
                  isActive("/#about-ksa")
                    ? "border-green-400 text-green-400"
                    : "border-transparent"
                }`}
              >
                Beranda
              </Link>
            </li>
            <li onClick={handleNav}>
              <Link
                href="/ksa-visualization"
                className={`border-b-2 pb-1 transition-all duration-200 ${
                  isActive("/ksa-visualization")
                    ? "border-green-400 text-green-400"
                    : "border-transparent"
                }`}
              >
                Fase Tanam
              </Link>
            </li>
            <li onClick={handleNav}>
              <Link
                href="/compare"
                className={`border-b-2 pb-1 transition-all duration-200 ${
                  isActive("/compare")
                    ? "border-green-400 text-green-400"
                    : "border-transparent"
                }`}
              >
                Harga Beras
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Header;