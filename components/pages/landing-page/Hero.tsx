"use client";

import React from "react";
import Link from "next/link";
import { motion, Variants, Transition } from "framer-motion";

interface HeroProps {
  heading: string;
  message: string;
}

const Hero: React.FC<HeroProps> = ({ heading, message }) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.5,
        staggerChildren: 0.3,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      } as Transition,
    },
  };

  const buttonVariants: Variants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        delay: 1.2,
      } as Transition,
    },
  };

  return (
    <section id="hero">
      <div className="relative flex w-full items-center h-[100vh] mb-[10rem] bg-fixed bg-center bg-cover hero-img">
        <div className="absolute h-full top-0 left-0 right-0 bottom-0 bg-black/40 z-[2]" />

        <motion.div
          className="p-4 sm:p-5 text-white z-[2] w-full"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.5 }}
        >
          <div className="mt-10 mx-auto text-center sm:ml-[10rem] sm:text-left max-w-[90%] sm:max-w-[800px]">
            <motion.h2
              className="text-3xl sm:text-4xl font-bold"
              variants={itemVariants}
            >
              {heading}
            </motion.h2>
            <motion.p
              className="py-3 sm:py-5 text-lg sm:text-xl font-semibold tracking-[3px] italic"
              variants={itemVariants}
            >
              {message}
            </motion.p>
            <motion.button className="px-4 py-2 sm:px-8 sm:py-2 border rounded-lg mt-4 cursor-pointer hover:bg-white/40 dark:hover:bg-white/20 transition-colors duration-200"
              variants={buttonVariants}
            >
              <Link href="/ksa-visualization">Analisis Terbaru Kami</Link>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;