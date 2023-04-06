
import { FC } from "react";
import Campaigns from "../../components/Campaigns";

export const CampaignsView: FC = ({ }) => {

  return (
    <div className="w-full h-[calc(100vh-10.5rem)] flex flex-col">
      <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-green-500 to-green-300 mt-10 mb-8">
        Campaigns
      </h1>
      <Campaigns />
    </div>
  );
};
