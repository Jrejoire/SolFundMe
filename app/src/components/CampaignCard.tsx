import { FC, useState } from "react";
import { Campaign } from "./Campaigns";
import idl from "../idl/solfundme.json";
import { Program, web3, BN } from "@project-serum/anchor";
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

const programID = new PublicKey(idl.metadata.address);
const idlString = JSON.stringify(idl);
const idlObject = JSON.parse(idlString);

const ProgressBar = ({ width }: { width: string }) => {
    return (
        <div className='w-full h-5 relative'>
            <div className={`${width} absolute left-0 top-0 z-10 h-full bg-green-500`}></div>
            <div className='absolute left-0 top-0 w-full h-5 bg-green-100' />
        </div>
    )
}

const StatusTag = ({ campaignInfo }: { campaignInfo: Campaign }) => {
    const timestampEnd = parseInt(campaignInfo.timestampEnd.toString())
    const now = Math.round(Date.now() / 1000);
    return (
        <div className="absolute top-3 right-3 text-white ">
            {
                now > timestampEnd ?
                    parseInt(campaignInfo.pledged.toString()) > parseInt(campaignInfo.goal.toString()) ?
                        <p className="bg-green-400 rounded-3xl p-2">FUNDED</p>
                        :
                        <p className="bg-red-300 rounded-3xl p-2">NOT FUNDED</p>
                    :
                    <p className="bg-gray-300 rounded-3xl p-2">ON GOING</p>
            }
        </div >
    )
}

type CampaignProps = {
    anchorProvider: any,
    fetchCampaigns: () => void,
    campaignInfo: Campaign,
};

const CampaignCard: FC<CampaignProps> = ({ anchorProvider, fetchCampaigns, campaignInfo }) => {
    const [amount, setAmount] = useState<string>("");
    const isFunded = parseFloat(campaignInfo.pledged.toString()) > parseFloat(campaignInfo.goal.toString());
    const isOver = Math.round(Date.now() / 1000) > parseInt(campaignInfo.timestampEnd.toString());
    const isPledger = anchorProvider.wallet.publicKey && campaignInfo.pledgers.some(pledger => pledger.address.toString() === anchorProvider.wallet.publicKey.toString());
    const isOwner = parseFloat(campaignInfo.pledged.toString()) > parseFloat(campaignInfo.goal.toString());
    
    const sendPledge = async (campaign: PublicKey, amount: string) => {
        try {
            if (!amount) {
                return;
            }
            if (Number.isNaN(parseInt(amount.toString()))) {
                return;
            }
            if (!anchorProvider.wallet.publicKey) {
                return;
            }
            const program = new Program(idlObject, programID, anchorProvider);
            await program.rpc.sendPledge(new BN(parseFloat(amount) * LAMPORTS_PER_SOL), {
                accounts: {
                    campaign,
                    user: anchorProvider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                }
            });
            fetchCampaigns();
        } catch (error) {
            console.log("Something went wrong");
            console.log(error);
        }
    }

    const cancelPledge = async (campaign: PublicKey) => {
        try {
            if (!anchorProvider.wallet.publicKey) {
                return;
            }
            const program = new Program(idlObject, programID, anchorProvider);
            await program.rpc.cancelPledge({
                accounts: {
                    campaign,
                    user: anchorProvider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                }
            });
            fetchCampaigns();
        } catch (error) {
            console.log("Something went wrong");
            console.log(error);
        }
    }

    const claimFunds = async (campaign: PublicKey) => {
        try {
            if (!anchorProvider.wallet.publicKey) {
                return;
            }
            const program = new Program(idlObject, programID, anchorProvider);
            await program.rpc.claimFunds({
                accounts: {
                    campaign,
                    user: anchorProvider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                }
            });
            fetchCampaigns();
        } catch (error) {
            console.log("Something went wrong");
            console.log(error);
        }
    }

    return (
        <div className='w-96 h-[30rem] border border-green-500 border-2'>
            <img src={`https://picsum.photos/450/200?random=${campaignInfo.pubkey.toString().slice(0, 10)}`} alt="thumbnail" />
            <ProgressBar width={`w-[${Math.round(24 * parseInt(campaignInfo.pledged.toString()) / parseInt(campaignInfo.goal.toString()))}rem]`} />
            <div className='relative w-full p-4'>
                <StatusTag campaignInfo={campaignInfo} />
                <h1 className='text-2xl'>{campaignInfo.name}</h1>
                <p>By {campaignInfo.owner.toString().slice(0, 10)}...{campaignInfo.owner.toString().slice(-10)}</p>
                <p className='text-green-600 font-bold'>{Math.round(parseInt(campaignInfo.pledged.toString()) / parseInt(campaignInfo.goal.toString()) * 100)}% funded</p>
                <p className='break-all mt-4'>{campaignInfo.description}</p>

                <div className='flex flex-col justify-between space-y-2 mt-6'>
                    {
                        isOver ?
                            isFunded ?
                                isOwner ?
                                    <button className='bg-green-400 text-white p-4 rounded-xl text-xl'
                                        onClick={() => claimFunds(campaignInfo.pubkey)}
                                    >
                                        Claim funds
                                    </button>
                                    :
                                    <button className='bg-gray-400 text-white p-4 rounded-xl text-xl'>
                                        Funded
                                    </button>
                                :
                                isPledger ?
                                    <button className='bg-green-400 text-white p-4 rounded-xl text-xl'
                                        onClick={() => claimFunds(campaignInfo.pubkey)}
                                    >
                                        Claim funds
                                    </button>
                                    :
                                    <button className='bg-gray-400 text-white p-4 rounded-xl text-xl'>
                                        Not funded
                                    </button>
                            :
                            isPledger ?
                                <button className='bg-gray-400 hover:bg-gray-500 text-white p-4 rounded-xl text-xl'
                                    onClick={() => cancelPledge(campaignInfo.pubkey)}
                                >
                                    Cancel pledge
                                </button>
                                :
                                <>
                                    <div className='w-full flex flex-row justify-start space-x-2'>
                                        <input type="text" className='grow border-2 border-green-500 rounded px-4 text-xl text-green-700 text-right' value={amount} onChange={(e) => setAmount(e.target.value)} />
                                        <p className='text-green-500 font-bold text-3xl'>SOL</p>
                                    </div>
                                    <button className='bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl text-xl'
                                        onClick={() => sendPledge(campaignInfo.pubkey, amount)}
                                    >
                                        Pledge
                                    </button>
                                </>
                    }
                </div>
            </div>
        </div>
    )
}

export default CampaignCard