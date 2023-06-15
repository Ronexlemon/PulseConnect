// @ts-nocheck
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
import Web3 from "web3";
import { newKitFromWeb3,CeloContract,ContractKit } from "@celo/contractkit";
import { useContractWrite, usePrepareContractWrite,useContractRead } from 'wagmi'

import { Alfajores_cusd,CELO_CUSD_Contract } from "@/utils/constants";
import contractAbi from "../utils/abis/cusdc.json"
import { Ierc20 } from "@celo/contractkit/lib/generated/IERC20";
import ierc20 from "../utils/abis/ierc20.json"

let ONE_CENT_CUSD = ethers.utils.parseEther("0.01");
const NOW_TIMESTAMP = Math.floor(new Date().getTime() / 1000);
type UseContractWriteArgs<TWriteContractMode, TABI, TFunctionName> = {
    address: string;
    abi: TABI;
    functionName: TFunctionName;
  };
  interface ContractAbi {
    inputs: {
      internalType: string;
      name: string;
      type: string;
    }[];
    name: string;
    outputs: never[];
    stateMutability: string;
    type: string;
  }
export default function SendPage({}) {
    const cu = ethers.utils.parseEther("1");
    const addressu:string ="0xc2b3C8645949ae4763ab85A39Cf8B3f57b09218A"
    const [isLoaded, setIsLoaded] = useState(false);
    const [lookupValue, setLookupValue] = useState("");
    const [lookupResult, setLookupResult] = useState([]);
    const [sendAmount,setAmount] = useState();
    const { isConnected, address } = useAccount();
    const { data: session, status } = useSession();
    const [finished, setFinished] = useState<boolean>(false);
    const {
        data:daty,
        
        write:send,
      } = useContractWrite({
        address: CELO_CUSD_Contract,
        abi: contractAbi,
        functionName: 'transfercUSD',
        args:[sendAmount,lookupResult[0]]

       
      });
      const {
        data:dates,
        isLoading:load,
        isSuccess:succ,
        write:writeApprove,
      } = useContractWrite({
        address:Alfajores_cusd,
        abi:ierc20 ,
        functionName: 'approve',
        args:[CELO_CUSD_Contract,sendAmount]

       
      });
      const { data } = useContractRead({
        address:CELO_CUSD_Contract,
        abi: contractAbi,
        functionName: 'balanceAll',
      })
    

    
    
    const {
        issuer,
        serviceContext,
        authSigner,
        odisPaymentsContract,
        stableTokenContract,
        federatedAttestationsContract,
    } = useContext(OdisContext);

   

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
    function handleSendAmountChange({target}){
        let {value} = target;
        console.log(value)
        console.log( typeof(lookupResult[0]))
        console.log(lookupResult[0])
        const newval = value.toString();
       const _amount=  ethers.utils.parseEther(newval);
        setAmount(_amount);
    }
    async function sendAll(){
        try{
            send();
        }catch(err){
            console.log(err)
        }
    } 
    async function ApproveAll(){
        try{
            writeApprove();
        }catch(err){
            console.log(err)
        }
    } 
    async function sendToAddressFinal() {
        try{
            await   sendAll();
        }catch(err){
            console.log(err);
        }
        
        
    }
    async function sendToAddress(amount:any) {
        try{
            await ApproveAll();
            setFinished(true);
          
           
        }catch(err){
            console.log(err)
        }
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
        <div className="flex flex-col space-y-4">
  <Header />
  <div className="flex justify-center items-center">
    <div className="flex space-x-4">
      <div className="w-[400px] border justify-between border-black p-4 flex-col flex space-y-2 rounded-lg bg-white shadow-lg">
        <div className="flex flex-col space-y-2">
          <h2 className="text-3xl font-bold text-center">Lookup</h2>
          <input
            className="border border-black px-4 py-2"
            placeholder="Twitter handle only (not @)"
            value={lookupValue}
            onChange={handleLookupValueChange}
          />
        </div>
        <div className="flex flex-col justify-start h-full">
          {lookupResult.map((address) => (
            <div className="flex border py-2 px-4 border-black" key={address}>
              <a
                href={`https://explorer.celo.org/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <h4 className="underline">
                  {`${address.slice(0, 10)}...${address.slice(-10)}`}
                </h4>
              </a>
            </div>
          ))}
        </div>
        <button
          onClick={() => lookupAddresses(lookupValue)}
          className="border-2 border-black px-4 py-2"
          disabled={lookupValue === ""}
        >
          Search
        </button>
      </div>
      <div className="w-[400px] border justify-between border-black p-4 flex-col flex space-y-2 rounded-lg bg-white shadow-lg">
        <div className="flex flex-col space-y-2">
          <h2 className="text-3xl font-bold text-center">Send</h2>
          <input
            className="border border-black px-4 py-2"
            placeholder="Recipient address"
             value={lookupResult}
             disabled
            // onChange={handleRecipientAddressChange}
          />
          <input
            className="border border-black px-4 py-2"
            placeholder="Amount"
             
             onChange={handleSendAmountChange}
          />
        </div>
        {finished? <button
           onClick={() => sendToAddressFinal( sendAmount)}
          className="border-2 border-black px-4 py-2"
        //   disabled={recipientAddress === "" || sendAmount === ""}
        >
            Send
        </button>: <button
           onClick={() => sendToAddress(sendAmount)}
          className="border-2 border-black px-4 py-2"
        //   disabled={recipientAddress === "" || sendAmount === ""}
        >
         Approve
        </button>}
        
      </div>
    </div>
  </div>
</div>

      

    );
}
