import { useAccount } from "wagmi";
import { useSession, signIn, signOut } from "next-auth/react";
import { useContext, useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { OdisContext } from "@/context/OdisContext";
import { OdisUtils } from "@celo/identity";
import { ethers } from "ethers";
import { WebBlsBlindingClient } from "@/utils/WebBlindingClient";
import { IdentifierPrefix } from "@celo/identity/lib/odis/identifier";
import { toast } from "react-hot-toast";
import NavBar from "../components/NavBar"
import Header from "@/components/HeaderRK";

let ONE_CENT_CUSD = ethers.utils.parseEther("0.01");
const NOW_TIMESTAMP = Math.floor(new Date().getTime() / 1000);

export default function RegistrationPage({}) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [lookupValue, setLookupValue] = useState("");
    const [lookupResult, setLookupResult] = useState([]);
    const {
        issuer,
        serviceContext,
        authSigner,
        odisPaymentsContract,
        stableTokenContract,
        federatedAttestationsContract,
    } = useContext(OdisContext);

    const { isConnected, address } = useAccount();
    const { data: session, status } = useSession();

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    if (!isLoaded) {
        return null;
    }

    function handleLookupValueChange({ target }) {
        let { value } = target;
        setLookupValue(value);
    }

    async function checkAndTopUpODISQuota() {
        const { remainingQuota } = await OdisUtils.Quota.getPnpQuotaStatus(
            issuer?.address,
            authSigner,
            serviceContext
        );
        console.log(remainingQuota);

        if (remainingQuota < 1) {
            const currentAllowance = await stableTokenContract.allowance(
                issuer.address,
                odisPaymentsContract.address
            );
            console.log("current allowance:", currentAllowance.toString());
            let enoughAllowance: boolean = false;

            if (ONE_CENT_CUSD.gt(currentAllowance)) {
                const approvalTxReceipt = await stableTokenContract
                    .increaseAllowance(
                        odisPaymentsContract.address,
                        ONE_CENT_CUSD
                    )
                    .sendAndWaitForReceipt();
                console.log("approval status", approvalTxReceipt.status);
                enoughAllowance = approvalTxReceipt.status;
            } else {
                enoughAllowance = true;
            }

            // increase quota
            if (enoughAllowance) {
                const odisPayment = await odisPaymentsContract
                    .payInCUSD(issuer.address, ONE_CENT_CUSD)
                    .sendAndWaitForReceipt();
                console.log("odis payment tx status:", odisPayment.status);
                console.log(
                    "odis payment tx hash:",
                    odisPayment.transactionHash
                );
            } else {
                throw "cUSD approval failed";
            }
        }
    }

    async function getIdentifier(twitterHandle: string) {
        try {
            await checkAndTopUpODISQuota();

            const blindingClient = new WebBlsBlindingClient(
                serviceContext.odisPubKey
            );

            await blindingClient.init();

            const { obfuscatedIdentifier } =
                await OdisUtils.Identifier.getObfuscatedIdentifier(
                    twitterHandle,
                    IdentifierPrefix.TWITTER,
                    issuer.address,
                    authSigner,
                    serviceContext,
                    undefined,
                    undefined,
                    blindingClient
                );

            return obfuscatedIdentifier;
        } catch (e) {
            console.log(e);
        }
    }

    async function registerIdentifier(twitterHandle: string, address: string) {
        try {
            const identifier = await getIdentifier(twitterHandle);

            console.log("Identifier", identifier);

            let tx =
                await federatedAttestationsContract.registerAttestationAsIssuer(
                    identifier,
                    address,
                    NOW_TIMESTAMP
                );

            let receipt = await tx.wait();
            console.log(receipt);
            toast.success("Registered!", { icon: "🔥" });
        } catch {
            toast.error("Something Went Wrong", { icon: "😞" });
        }
    }

    async function revokeIdentifier(twitterHandle: string, address: string) {
        try {
            const identifier = await getIdentifier(twitterHandle);

            console.log("Identifier", identifier);

            let tx = await federatedAttestationsContract.revokeAttestation(
                identifier,
                issuer.address,
                address
            );

            let receipt = await tx.wait();
            console.log(receipt);
            toast.success("Revoked!", { icon: "🔥" });
        } catch {
            toast.error("Something Went Wrong", { icon: "😞" });
        }
    }

    async function lookupAddresses(twitterHandle: string) {
        try {
            const obfuscatedIdentifier = await getIdentifier(twitterHandle);

            // query onchain mappings
            const attestations =
                federatedAttestationsContract.lookupAttestations(
                    obfuscatedIdentifier,
                    [issuer.address]
                );

            toast.promise(attestations, {
                loading: () => "Searching...",
                success: (data) => {
                    let accounts = data.accounts;
                    if (accounts.length > 0) {
                        setLookupResult(accounts);
                    } else {
                        toast.error("No Accounts found", { icon: "🧐" });
                    }
                },
                error: (err) => "Something Went Wrong",
            });
        } catch {
            toast.error("Something went wrong", { icon: "😞" });
        }
    }

    return (
        <div className="w-full h-full bg-custom-color">
  <Header />
  <div className="flex justify-center items-center h-full">
    <div className="w-3/4 rounded-lg bg-white shadow-lg m-14">
      <div className="w-full border border-black p-4 flex flex-col space-y-2">
        <h2 className="text-3xl font-bold text-center">Registration</h2>
        
        <div className="flex">
          <div className="flex-shrink-0">
            <img
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "100%",
              }}
              src={session?.user?.image as string}
              alt="User Avatar"
            />
          </div>
          <div className="flex-grow pl-4">
            <h2 className="text-xl font-semibold">{session?.user!.name}</h2>
            <h3 className="text-md">@{session?.username.toLowerCase()}</h3>
          </div>
        </div>

        <div className="flex justify-end">
          {status === "unauthenticated" ? (
            <button
              onClick={() => signIn()}
              className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200"
            >
              Sign in 
            </button>
          ) : status === "loading" ? (
            <h1>Loading...</h1>
          ) : (
            <button
              className="px-4 py-2 rounded-md bg-orange-200 hover:bg-gray-200"
              onClick={() => signOut()}
            >
              Sign Out
            </button>
          )}
        </div>

        {isConnected && status === "authenticated" && (
          <button
            onClick={() => registerIdentifier(session.username.toLowerCase(), address)}
            className="px-4 w-[200px] py-2 rounded-md bg-yellow-400 hover:bg-gray-200"
          >
            Link Wallet
          </button>
        )}

      </div>
    </div>
  </div>
</div>

    );
}
