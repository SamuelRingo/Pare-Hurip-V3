"use client";

import React from "react";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";

const AboutKSA = () => {
  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
  };

  const imageVariants: Variants = {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
  };

  return (
    <section id="about-ksa" className="py-20 bg-white dark:bg-slate-950">
      <motion.div
        className="container mx-auto px-6 max-w-6xl"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.3 }} 
      >
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
          {/* Text Column */}
          <motion.div className="md:w-1/2 text-center md:text-left" variants={itemVariants}>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-slate-100 mb-4">
              KSA itu Apa Sih?
            </h2>
            <div className="w-24 h-1 bg-green-700 mx-auto md:mx-0 mb-6" />
            <p className="text-lg text-gray-600 dark:text-slate-400 leading-relaxed">
              KSA (Kerangka Sampel Area) adalah survei berbasis area yang dilakukan dengan pengamatan langsung terhadap sampel segmen dan bertujuan untuk mengestimasi luasan dengan ekstrapolasi dari sampel ke populasi dalam periode yang relatif pendek (rapid estimate). Survei KSA menggunakan metode pengambilan sampel yang menggunakan area lahan sebagai unit sampel, Mulai dari persiapan lahan hingga panen. Harapannya KSA menyediakan data luas panen yang objektif, modern, dan andal untuk mendukung terwujudnya ketahanan pangan.
            </p>
          </motion.div>

          {/* Image Column */}
          <motion.div 
            className="md:w-1/2 w-full"
            variants={imageVariants}
          >
            <div className="relative w-full h-80 shadow-xl rounded-lg overflow-hidden">
              <Image
                src="https://i.ibb.co.com/bjRGN41Z/fc9cad81-5030-4085-be77-6ec631d09a25-1.png" 
                alt="Pemandangan sawah untuk deskripsi KSA"
                layout="fill"
                objectFit="cover"
                className="transform hover:scale-105 transition-transform duration-500"
              />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default AboutKSA;