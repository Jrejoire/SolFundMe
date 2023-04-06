// Next, React
import { FC, useEffect, useState } from 'react';
import Link from 'next/link';

// Wallet
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

// Components
import { RequestAirdrop } from '../../components/RequestAirdrop';
import pkg from '../../../package.json';

// Store
import useUserSOLBalanceStore from '../../stores/useUserSOLBalanceStore';

export const HomeView: FC = ({ }) => {
  const wallet = useWallet();
  const { connection } = useConnection();

  const balance = useUserSOLBalanceStore((s) => s.balance)
  const { getUserSOLBalance } = useUserSOLBalanceStore()

  useEffect(() => {
    if (wallet.publicKey) {
      console.log(wallet.publicKey.toBase58())
      getUserSOLBalance(wallet.publicKey, connection)
    }
  }, [wallet.publicKey, connection, getUserSOLBalance])

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col mt-12">
        <h4 className="md:w-full text-2x1 md:text-4xl text-center text-slate-300 my-2">
          <p>The new generation of crowd-funding!</p>
          <p className='text-slate-500 text-2x1 leading-relaxed'>Airdrop on devnet to use the dapp</p>
        </h4>
        <div className="flex flex-col mt-2 items-center">
          <RequestAirdrop />
          <h4 className="md:w-full text-2xl text-slate-300 my-2">
            {wallet &&
              <div className="flex flex-row justify-center">
                <div>
                  {(balance || 0).toLocaleString()}
                </div>
                <div className='text-slate-600 ml-2'>
                  SOL
                </div>
              </div>
            }
          </h4>
        </div>
      </div>
    </div>
  );
};
