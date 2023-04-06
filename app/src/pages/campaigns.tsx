import type { NextPage } from "next";
import Head from "next/head";
import { CampaignsView } from "../views";

const Basics: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>SolFundMe</title>
        <meta
          name="description"
          content="Campaigns"
        />
      </Head>
      <CampaignsView />
    </div>
  );
};

export default Basics;
