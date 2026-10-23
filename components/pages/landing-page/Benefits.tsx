"use client";

import React from "react";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { FiDatabase, FiMap, FiBarChart, FiTrendingUp } from "react-icons/fi";

const usesData = [
  {
    icon: <FiDatabase size={28} className="text-green-700 dark:text-green-500" />,
    title: "Data Obyektif",
    description: "Mengurangi subjektivitas dalam pengumpulan data luas panen padi.",
  },
  {
    icon: <FiMap size={28} className="text-green-700 dark:text-green-500" />,
    title: "Mengukur Estimasi Luas Panen",
    description: "KSA dapat mengestimasi luasan tanaman padi dalam periode tertentu secara objektif dan akurat.",
  },
  {
    icon: <FiTrendingUp size={28} className="text-green-700 dark:text-green-500" />,
    title: "Modernisasi Statistik",
    description: "Menggantikan metode konvensional dengan teknologi modern.",
  },
  {
    icon: <FiBarChart size={28} className="text-green-700 dark:text-green-500" />,
    title: "Dukungan Kebijakan Ketahanan Pangan",
    description: "Mewujudkan visi negara (Sustainable Development Goals \"Zero Hunger\").",
  },
];

const Benefits = () => {
  const sectionVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.2 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section id="ksa-uses" className="py-20 bg-gray-50 dark:bg-slate-900">
      <div className="container mx-auto px-6 max-w-6xl">
        <motion.div
          className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          variants={sectionVariants}
        >
          {/* Main Image */}
          <motion.div className="lg:w-2/5 w-full" variants={itemVariants}>
            <div className="relative h-96 lg:h-[500px] w-full rounded-lg shadow-2xl overflow-hidden">
              <Image
                src="https://i.ibb.co.com/dw6vsjrY/1ae134bd-8b49-4e53-8871-c8750746a61d-2.png"
                alt="Kegunaan KSA"
                layout="fill"
                objectFit="cover"
              />
            </div>
          </motion.div>

          {/* Uses List */}
          <motion.div className="lg:w-3/5" variants={itemVariants}>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-slate-100 mb-2 text-center lg:text-left">
              Kegunaan KSA
            </h2>
            <div className="w-24 h-1 bg-green-700 mx-auto lg:mx-0 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {usesData.map((use, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all">
                  <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/50 p-3 rounded-full">
                    {use.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-1">{use.title}</h3>
                    <p className="text-gray-600 dark:text-slate-400">{use.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Benefits;