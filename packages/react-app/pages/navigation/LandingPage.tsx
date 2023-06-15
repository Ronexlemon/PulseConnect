import React from "react";
import NavBar from "@/components/NavBar";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen w-screen bg-black">
      <NavBar />
      <div className="flex justify-center items-center w-full h-full mt-28">
        <div className="h-3/4 w-3/4 bg-blue-200 rounded">
          <Image
            className="block h-96 w-full sm:block lg:block"
            src="/c.png"
            width="100"
            height="200"
            alt="Celo Logo"
          />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-white text-4xl font-bold  animate-ping">
              PULS3 CONN3CT
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}
