 "use client";

import React from "react";
import Image from "next/image";
import { motion, Variants } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const growthCycleData = [
    {
      title: "Vegetatif 1",
      description: "Fase sejak tanaman padi ditanam sampai anak maksimum. Dengan ciri jarak antar tanaman terlihat dan daun belum rimbun.",
      imageUrl: "https://i.ibb.co.com/YFnGV6Kn/veg-1.png",
    },
    {
      title: "Vegetatif 2",
      description: "Fase tumbuh dari anakan maksimum sampai sebelum keluar malai. Dengan ciri jarak antar tanaman sudah tidak terlihat jelas dan daun rimbun.",
      imageUrl: "https://i.ibb.co.com/cq19qDf/542f4b4a-e4e8-4864-b7ff-ce6b12ae88ff.png",
    },
    {
      title: "Generatif 1",
      description: "Fase tumbuh saat padi mulai dari keluar malai (bulir padi). Dengan ciri muncul malai/bulir padi yang masih muda.",
      imageUrl: "https://i.ibb.co.com/20gcmw6D/gen-1.png",
    },
    {
      title: "Generatif 2",
      description: "Fase padi mengalami pematangan setelah keluar malai. Dengan ciri bulir dan daun padi mulai berubah warna menjadi menguning.",
      imageUrl: "https://i.ibb.co.com/7t0jwvCs/gen-2.png",
    },
    {
      title: "Generatif 3",
      description: "Fase padi sudah mengalami pematangan sempurna sampai sebelum panen. Dengan ciri warna bulir padi sudah menguning semua.",
      imageUrl: "https://i.ibb.co.com/FkqRvr93/gen-3-1.png",
    },
    {
      title: "Panen",
      description: "Fase pada saat padi sedang dalam proses pemanenan atau telah dipanen. Dengan ciri jika padi sudah dipanen hanya terlihat sisa batang padi.",
      imageUrl: "https://i.ibb.co.com/xSfrV8BJ/panen.png",
    },
    {
      title: "Bera",
      description: "Periode di mana lahan sawah dibiarkan tidak ditanami padi atau tanaman budidaya lainnya.",
      imageUrl: "https://i.ibb.co.com/qMZk2tgR/bera.png",
    },
    {
      title: "Persiapan Lahan",
      description: "Fase pada saat lahan sedang atau sudah diolah baik yang akan ditanami padi maupun tidak ditanami padi.",
      imageUrl: "https://i.ibb.co.com/FkrQjQXB/per-lahan.png",
    },
];

const SiklusTumbuhPadi = () => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <section id="siklus-padi" className="py-20 bg-gray-50 dark:bg-slate-900 overflow-x-hidden">
      <motion.div
        className="container mx-auto px-6 max-w-6xl"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.2 }}
      >
        <div className="text-center mb-12">
          <motion.h2
            variants={itemVariants}
            className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-slate-100 mb-4"
          >
            Siklus Pertumbuhan Padi
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-lg text-gray-600 dark:text-slate-300 max-w-3xl mx-auto"
          >
            Kenali setiap fase dalam siklus hidup padi, dari persiapan lahan hingga masa panen yang menentukan.
          </motion.p>
          <motion.div
            variants={itemVariants}
            className="w-24 h-1 bg-green-700 mx-auto mt-4"
          />
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full max-w-xs sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto"
        >
          <CarouselContent>
            {growthCycleData.map((phase, index) => (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                <motion.div
                  className="p-1 h-full"
                  variants={itemVariants}
                >
                  <Card className="h-full flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 group">
                    <div className="relative w-full h-48 overflow-hidden rounded-t-lg bg-slate-100 dark:bg-slate-800">
                      <Image
                        src={phase.imageUrl}
                        alt={`Gambar fase ${phase.title}`}
                        fill
                        style={{ objectFit: "cover" }}
                        className="transform group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-800 dark:text-slate-100">{phase.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-gray-600 dark:text-slate-400">{phase.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
      </motion.div>
    </section>
  );
};

export default SiklusTumbuhPadi;