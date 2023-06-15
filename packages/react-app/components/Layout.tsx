import { FC, ReactNode } from "react";
import Footer from "./Footer";
import Header from "./HeaderRK";
import NavBar from "./NavBar";

interface Props {
    children: ReactNode
}
const Layout: FC<Props> = ({children}) => {
    return (
        <>
             <div className="bg-gypsum overflow-hidden flex flex-col min-h-screen w-full">

      
        <div className="w-full h-full ">{children}</div>
      
      {/* <Footer /> */}
    </div>
        </>
    )
}

export default Layout;