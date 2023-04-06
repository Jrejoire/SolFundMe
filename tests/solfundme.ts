import * as anchor from "@coral-xyz/anchor";
import { expect } from 'chai';
import { Solfundme } from "../target/types/solfundme";
const { SystemProgram } = anchor.web3
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { utils } from "@project-serum/anchor";

describe("solfundme", () => {
  const program = anchor.workspace.Solfundme as anchor.Program<Solfundme>;
  const contributer = anchor.web3.Keypair.generate();
  const campainOwner = anchor.web3.Keypair.generate();
  const campainOwner_2 = anchor.web3.Keypair.generate();
  const connection = new Connection("http://127.0.0.1:8899");

  it("should fund wallets", async () => {
    const txOwner = await connection.requestAirdrop(campainOwner.publicKey, 1 * LAMPORTS_PER_SOL);
    const txOwner_2 = await connection.requestAirdrop(campainOwner_2.publicKey, 1 * LAMPORTS_PER_SOL);
    const txUser = await connection.requestAirdrop(contributer.publicKey, 2 * LAMPORTS_PER_SOL);
    await new Promise(resolve => setTimeout(resolve, 2 * 1000));
    expect(txOwner).to.not.equal(null);
    expect(txOwner_2).to.not.equal(null);
    expect(txUser).to.not.equal(null);
  })

  const [campaign] = PublicKey.findProgramAddressSync([
    utils.bytes.utf8.encode("solfundme"),
    campainOwner.publicKey.toBuffer(),
  ], program.programId);

  it("should init campaign", async () => {
    await program.methods.initCampaign("campaign_1", "This is to fund my degen lifestyle.", new anchor.BN(0.5 * LAMPORTS_PER_SOL), new anchor.BN(3))
      .accounts({
        campaign,
        user: campainOwner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([campainOwner])
      .rpc();

    const account = await program.account.campaign.fetch(campaign);
    expect(account.pledged.toString()).to.equal("0");
    expect(account.goal.toString()).to.equal((0.5 * LAMPORTS_PER_SOL).toString());
  })

  it("should add pledge to the campaign", async () => {
    await program.methods.sendPledge(new anchor.BN(0.5 * LAMPORTS_PER_SOL)).accounts({ campaign, user: contributer.publicKey, systemProgram: SystemProgram.programId }).signers([contributer]).rpc();

    const account = await program.account.campaign.fetch(campaign);
    expect(account.pledgers[0].address.toString()).to.equal(contributer.publicKey.toString());
    expect(account.pledgers[0].pledge.toString()).to.equal(`${0.5 * LAMPORTS_PER_SOL}`);
    expect(account.pledged.toString()).to.equal(`${0.5 * LAMPORTS_PER_SOL}`);
  })

  it("should return an error if pledger already pledged", async () => {
    let tx = undefined;
    try {
      tx = await program.methods.sendPledge(new anchor.BN(0.4 * LAMPORTS_PER_SOL)).accounts({ campaign, user: contributer.publicKey, systemProgram: SystemProgram.programId }).signers([contributer]).rpc();
    } catch (err) {
      expect(err).to.not.equal(null);
    }
    expect(tx).to.equal(undefined);
  })

  it("should cancel pledge", async () => {
    await program.methods.cancelPledge().accounts({ campaign, user: contributer.publicKey, systemProgram: SystemProgram.programId }).signers([contributer]).rpc();

    const account = await program.account.campaign.fetch(campaign);
    expect(account.pledgers.length).to.equal(0);
    expect(account.pledgers.some(pledger => pledger.address.toString() === contributer.publicKey.toString())).to.equal(false);
  })

  it("should return an error if pledger doesn't exist", async () => {
    let tx = undefined;
    try {
      tx = await program.methods.cancelPledge().accounts({ campaign, user: contributer.publicKey, systemProgram: SystemProgram.programId }).signers([contributer]).rpc();
    } catch (err) {
      expect(err).to.not.equal(null);
    }
    expect(tx).to.equal(undefined);
  })

  it("should check campaign and find out that it's over and funded", async () => {
    await program.methods.sendPledge(new anchor.BN(0.5 * LAMPORTS_PER_SOL)).accounts({ campaign, user: contributer.publicKey, systemProgram: SystemProgram.programId }).signers([contributer]).rpc();
    await new Promise(resolve => setTimeout(resolve, 4 * 1000));
    await program.methods.checkCampaign().accounts({ campaign, user: campainOwner.publicKey, systemProgram: SystemProgram.programId }).signers([campainOwner]).rpc();

    const account = await program.account.campaign.fetch(campaign);
    expect(account.isFunded).to.equal(true);
    expect(account.isActive).to.equal(false);
  })

  it("should not refund user on claim if campaign is over and funded", async () => {
    let tx = undefined;
    try {
      tx = await program.methods.claimFunds().accounts({ campaign, user: contributer.publicKey, systemProgram: SystemProgram.programId }).signers([contributer]).rpc();
    } catch (err) {
      expect(err).to.not.equal(null);
    }
    expect(tx).to.equal(undefined);
  })

  it("should return an error when contributer attempts to claim funds on over and funded campaign", async () => {
    let tx = undefined;
    try {
      await program.methods.claimFunds().accounts({ campaign, user: contributer.publicKey, systemProgram: SystemProgram.programId }).signers([contributer]).rpc();
    } catch (err) {
      expect(err).to.not.equal(null);
    }
    expect(tx).to.equal(undefined);
  })

  it("should return an error when user attempts to cancel pledge on over and funded campaign", async () => {
    let tx = undefined;
    try {
      await program.methods.cancelPledge().accounts({ campaign, user: contributer.publicKey, systemProgram: SystemProgram.programId }).signers([contributer]).rpc();
    } catch (err) {
      expect(err).to.not.equal(null);
    }
    expect(tx).to.equal(undefined);
  })

  const [campaign_2] = PublicKey.findProgramAddressSync([
    utils.bytes.utf8.encode("solfundme"),
    campainOwner_2.publicKey.toBuffer(),
  ], program.programId);

  it("should check that campaign is over but not funded", async () => {
    await program.methods.initCampaign("campaign_2", "This is to make a cool crypto project.", new anchor.BN(0.5 * LAMPORTS_PER_SOL), new anchor.BN(0))
      .accounts({
        campaign: campaign_2,
        user: campainOwner_2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([campainOwner_2])
      .rpc();

    await program.methods.sendPledge(new anchor.BN(0.1 * LAMPORTS_PER_SOL)).accounts({ campaign: campaign_2, user: contributer.publicKey, systemProgram: SystemProgram.programId }).signers([contributer]).rpc();
    await program.methods.checkCampaign().accounts({ campaign: campaign_2, user: campainOwner_2.publicKey, systemProgram: SystemProgram.programId }).signers([campainOwner_2]).rpc();

    const account = await program.account.campaign.fetch(campaign_2);
    expect(account.pledgers.length).to.equal(1);
    expect(account.isFunded).to.equal(false);
    expect(account.isActive).to.equal(false);
  })

  it("should allow contributers to claim back funds if campaign is over but not funded", async () => {
    await program.methods.claimFunds().accounts({ campaign: campaign_2, user: contributer.publicKey, systemProgram: SystemProgram.programId }).signers([contributer]).rpc();
    const account = await program.account.campaign.fetch(campaign_2);
    expect(account.pledgers[0].pledge.toString()).to.equal("0");
  })
});
