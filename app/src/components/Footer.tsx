import { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';
export const Footer: FC = () => {
    return (
        <footer className="h-20 border-t-4 border-black bg-white absolute w-full flex justify-around items-center text-black text-xl font-bold" >
            <h2>Solana Devnet</h2>
            <h2 className='text-green-500'>SolFundMe - 2023</h2>
            <Link className="hover:text-green-500" href="https://twitter.com/Jrej_dev">Made by @Jrej</Link>
        </footer>
    );
};
