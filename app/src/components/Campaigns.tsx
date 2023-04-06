import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { FC, useState } from 'react';
import idl from "../idl/solfundme.json";
import { Program, AnchorProvider, web3, utils, BN } from "@project-serum/anchor";
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useEffect } from 'react';
import CampaignCard from "./CampaignCard";

const programID = new PublicKey(idl.metadata.address);
const idlString = JSON.stringify(idl);
const idlObject = JSON.parse(idlString);

export type Campaign = {
    description: string,
    goal: BN,
    isActive: boolean,
    isFunded: false,
    name: string,
    owner: PublicKey,
    pledged: BN,
    pledgers: { address: PublicKey, pledge: BN }[],
    timestampEnd: BN,
    timestampStart: BN,
    pubkey: PublicKey,
};

const Campaigns = () => {
    const wallet = useWallet();
    const { connection } = useConnection();
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [campaignName, setCampaignName] = useState<string>("");
    const [campaignDescription, setCampaignDescription] = useState<string>("");
    const [campaignDuration, setCampaignDuration] = useState<string>("");
    const [campaignGoal, setCampaignGoal] = useState<string>("");

    const getProvider = () => {
        return new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
    };
    const anchorProvider = getProvider();

    const fetchCampaigns = async () => {
        try {
            const program = new Program(idlObject, programID, anchorProvider);

            let fetchedCampaigns = [];
            let programAccounts = await Promise.all((await connection.getProgramAccounts(programID)));
            for (let campaign of programAccounts) {
                let campaignInfo = await program.account.campaign.fetch(campaign.pubkey);
                fetchedCampaigns.push({ ...campaignInfo, pubkey: campaign.pubkey })
            }
            const sortedCampaigns = fetchedCampaigns.sort((a, b) => (parseInt(b.timestampEnd.toString()) - parseInt(a.timestampEnd.toString())));
            setCampaigns(sortedCampaigns);
        } catch (error) {
            console.log("Something went wrong");
            console.log(error);
        }
    };

    const checkCampaign = async (campaign: Campaign) => {
        try {
            const now = Math.round(Date.now() / 1000);
            if (campaign.isActive && now > parseInt(campaign.timestampEnd.toString())) {
                const program = new Program(idlObject, programID, anchorProvider);
                await program.rpc.checkCampaign({
                    accounts: {
                        campaign: campaign.pubkey,
                        user: anchorProvider.wallet.publicKey,
                        systemProgram: web3.SystemProgram.programId,
                    }
                });
                fetchCampaigns();
            }
        } catch (err) {
            console.log("Something went wrong");
            console.log(err);
        }
    }

    const checkCampaigns = async (campaigns: Campaign[]) => {
        if (!campaigns || campaigns.length === 0) {
            return;
        }
        for (let campaign of campaigns) {
            checkCampaign(campaign);
        }
    }

    useEffect(() => {
        fetchCampaigns();
        checkCampaigns(campaigns);
    }, [])

    const createCampaign = async () => {
        try {
            if (!campaignName || !campaignDescription || !campaignDuration || !campaignGoal) {
                return;
            }
            if (Number.isNaN(parseInt(campaignDuration)) || Number.isNaN(parseInt(campaignGoal))) {
                return;
            }

            if (!anchorProvider.wallet.publicKey) {
                return;
            }
            const program = new Program(idlObject, programID, anchorProvider);
            const [campaign] = PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("solfundme"),
                anchorProvider.wallet.publicKey.toBuffer(),
            ], program.programId);

            await program.rpc.initCampaign(campaignName, campaignDescription, new BN(parseFloat(campaignGoal) * LAMPORTS_PER_SOL), new BN(parseInt(campaignDuration)), {
                accounts: {
                    campaign,
                    user: anchorProvider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                }
            });

            console.log(`Campaign was created: ${campaign.toString()}`);
            fetchCampaigns();
        } catch (error) {
            console.log("Something went wrong");
            console.log(error);
        }
    }

    return (
        <div className='w-full h-full text-black p-6'>
            <div className='flex justify-around items-center border border-2 p-4'>
                <div className='flex justify-start flex-wrap space-x-4 space-y-2'>
                    <div className='flex items-center space-x-4'>
                        <label htmlFor="">Campaign name</label>
                        <input className='border border-2 p-2' type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
                    </div>
                    <div className='flex items-center space-x-4'>
                        <label htmlFor="">Campaign description</label>
                        <textarea className='border border-2 p-2' value={campaignDescription} onChange={(e) => setCampaignDescription(e.target.value)} />
                    </div>
                    <div className='flex items-center space-x-4'>
                        <label htmlFor="">Campaign goal (SOL)</label>
                        <input className='border border-2 p-2' type="text" value={campaignGoal} onChange={(e) => setCampaignGoal(e.target.value)} />
                    </div>
                    <div className='flex items-center space-x-4'>
                        <label htmlFor="">Campaign duration (seconds)</label>
                        <input className='border border-2 p-2' type="text" value={campaignDuration} onChange={(e) => setCampaignDuration(e.target.value)} />
                    </div>

                </div>
                <button className='bg-green-500 text-white p-6 rounded-xl text-xl hover:bg-green-600' onClick={createCampaign}>Create new Campaign</button>
            </div>
            <div className='flex flex-wrap justify-around items-center mt-6 gap-6'>
                {
                    campaigns?.length === 0 ?
                        <p>Not campaigns found</p>
                        :
                        campaigns.map((campaign, index) => (
                            <div key={index} className='flex justify-center items-center'>
                                <CampaignCard anchorProvider={anchorProvider} fetchCampaigns={fetchCampaigns} campaignInfo={campaign} />
                            </div>
                        ))
                }
            </div>
        </div>
    )
}

export default Campaigns;
