import { Disclosure } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import SocialPage from "@/pages/send";

export default function NavBar() {
    return (
        <nav className="bg-orange-400 flex justify-evenly items-center border-b py-4  border-black">
            <div>
                <h2>PulseConnect</h2>
            </div>
            <div className="bg-gray-300 w-20 rounded items-center" >
            <Link href="/register" >
        Launch
      </Link>
            </div>
            
      
        </nav>
    );
}
