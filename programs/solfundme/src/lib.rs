use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;

declare_id!("9kYU5QF9ecxxn7PxijJ1BCGcsos9fPJmvTF34yANWEPq");

#[program]
pub mod solfundme {
    use super::*;

    pub fn init_campaign(
        ctx: Context<InitCampaign>,
        name: String,
        description: String,
        goal: u64,
        duration_seconds: i64,
    ) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign;
        campaign.goal = goal;
        campaign.owner = *ctx.accounts.user.key;
        campaign.pledged = 0;
        campaign.pledgers = Vec::new();
        campaign.name = name;
        campaign.description = description;
        campaign.is_active = true;
        campaign.is_funded = false;

        let clock = Clock::get()?;
        campaign.timestamp_start = clock.unix_timestamp;
        campaign.timestamp_end = clock.unix_timestamp + duration_seconds;

        Ok({})
    }

    pub fn send_pledge(ctx: Context<SendPledge>, amount: u64) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign;
        let user = &mut ctx.accounts.user;

        let is_pledger = campaign
            .pledgers
            .iter()
            .any(|pledger| (pledger.address == *user.key) & (pledger.pledge > 0));

        if is_pledger {
            return Err(ProgramError::InvalidAccountData);
        }

        let txn = anchor_lang::solana_program::system_instruction::transfer(
            &user.key(),
            &campaign.key(),
            amount,
        );

        anchor_lang::solana_program::program::invoke(
            &txn,
            &[user.to_account_info(), campaign.to_account_info()],
        )?;

        let pledger = Pledger {
            address: *user.key,
            pledge: amount,
        };

        campaign.pledgers.push(pledger);
        campaign.pledged += amount;

        campaign.is_funded = campaign.pledged >= campaign.goal;

        Ok({})
    }

    pub fn cancel_pledge(ctx: Context<CancelPledge>) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign;
        let user = &mut ctx.accounts.user;

        let is_pledger = campaign
            .pledgers
            .iter()
            .any(|pledger| (pledger.address == *user.key) & (pledger.pledge > 0));

        if !is_pledger {
            return Err(ProgramError::InvalidAccountData);
        }

        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;
        let is_campaign_over = current_timestamp > campaign.timestamp_end;
        if is_campaign_over {
            return Err(ProgramError::InvalidAccountData);
        }

        let index = campaign
            .pledgers
            .iter()
            .position(|pledger| pledger.address == *user.key)
            .unwrap();

        let pledger = &campaign.pledgers[index];

        if pledger.address != user.key() {
            return Err(ProgramError::InvalidAccountData);
        }

        **campaign.to_account_info().try_borrow_mut_lamports()? -= pledger.pledge;
        **user.to_account_info().try_borrow_mut_lamports()? += pledger.pledge;
        campaign.pledged -= pledger.pledge;

        let _ = &campaign.pledgers.remove(index);

        Ok({})
    }

    pub fn check_campaign(ctx: Context<CheckCampaign>) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign;

        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;
        let is_campaign_over = current_timestamp > campaign.timestamp_end;

        if !is_campaign_over {
            return Err(ProgramError::InvalidAccountData);
        }

        if !campaign.is_active {
            return Err(ProgramError::InvalidAccountData);
        }

        campaign.is_funded = campaign.pledged >= campaign.goal;
        campaign.is_active = false;

        Ok({})
    }

    pub fn claim_funds(ctx: Context<ClaimFunds>) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign;
        let user = &mut ctx.accounts.user;

        if campaign.is_active {
            return Err(ProgramError::InvalidAccountData);
        }

        if campaign.is_funded {
            if *user.key != campaign.owner {
                return Err(ProgramError::InvalidAccountData);
            }

            **campaign.to_account_info().try_borrow_mut_lamports()? -= campaign.pledged;
            **user.to_account_info().try_borrow_mut_lamports()? += campaign.pledged;
        } else {
            let is_pledger = campaign
                .pledgers
                .iter()
                .any(|pledger| (pledger.address == *user.key) & (pledger.pledge > 0));

            if !is_pledger {
                return Err(ProgramError::InvalidAccountData);
            }

            let index = campaign
                .pledgers
                .iter()
                .position(|pledger| pledger.address == *user.key)
                .unwrap();

            let pledge = campaign.pledgers[index].pledge;
            if pledge == 0 {
                return Err(ProgramError::InvalidAccountData);
            }

            **campaign.to_account_info().try_borrow_mut_lamports()? -= pledge;
            **user.to_account_info().try_borrow_mut_lamports()? += pledge;

            campaign.pledgers[index].pledge = 0;
        }
        
        Ok({})
    }
}

#[derive(Accounts)]
pub struct InitCampaign<'info> {
    #[account(init, payer=user, space=5000, seeds=[b"solfundme", user.key().as_ref()], bump)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendPledge<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelPledge<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckCampaign<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimFunds<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Campaign {
    goal: u64,
    pledged: u64,
    pledgers: Vec<Pledger>,
    name: String,
    description: String,
    owner: Pubkey,
    timestamp_start: i64,
    timestamp_end: i64,
    is_active: bool,
    is_funded: bool,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Pledger {
    address: Pubkey,
    pledge: u64,
}
