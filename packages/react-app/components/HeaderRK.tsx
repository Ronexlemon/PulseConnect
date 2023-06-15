import { Disclosure } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

export default function Header() {
    return (
        <nav className="bg-green-400 flex justify-evenly items-center border-b py-4  border-black">
            <Link href="/">
            <Image
                className="block h-8 w-auto sm:block lg:block"
                src="/logo.svg"
                width="24"
                height="24"
                alt="Celo Logo"
                
            />
      </Link>
      <Link href="/register">Register</Link>
             <Link href="/lookup">Lookup</Link>
             <Link href="/revoke">Revoke</Link>
             <Link href="/send">Send</Link>
            <ConnectButton/>
        </nav>
    );
}
