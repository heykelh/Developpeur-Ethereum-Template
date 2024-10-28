import { expect, assert } from "chai";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
import { Voting } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers"; 

describe("Voting Contract Tests", function () {
    let voting: Voting;
    let owner: any;
    let addr1: any;
    let addr2: any;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        const VotingFactory = await ethers.getContractFactory("Voting");
        voting = (await VotingFactory.deploy()) as Voting;
        //await voting.deployed();
        //const Voting = await hre.ethers.deployContract("Voting");
        //deployedContract = Voting;
    });

    // Test de deploy
    describe("Deployment", function () {
        it("Should deploy with RegisteringVoters as the initial state", async function () {
            const initialState = await voting.workflowStatus();
            expect(initialState).to.equal(0); // RegisteringVoters enum is 0
        });
    });

    // Test registration
    describe("Voter Registration", function () {
        it("Should allow only the owner to register voters", async function () {
            await voting.addVoter(addr1.address);
            const voter = await voting.getVoter(addr1.address);
            expect(voter.isRegistered).to.be.true;
        });

        it("Should revert if a non-owner tries to register a voter", async function () {
            await expect(
                voting.connect(addr1).addVoter(addr2.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow registering voters only in the RegisteringVoters status", async function () {
            await voting.startProposalsRegistering();
            await expect(
                voting.addVoter(addr1.address)
            ).to.be.revertedWith("Voters registration is not open yet");
        });

        it("Should not allow the same voter to be registered twice", async function () {
            await voting.addVoter(addr1.address);
            await expect(
                voting.addVoter(addr1.address)
            ).to.be.revertedWith("Already registered");
        });
    });

    // Test ajout proposal
    describe("Proposal Registration", function () {
        beforeEach(async function () {
            await voting.addVoter(addr1.address);
            await voting.startProposalsRegistering();
        });

        it("Should allow voters to register a proposal", async function () {
            await voting.connect(addr1).addProposal("Proposal 1");
            const proposal = await voting.getOneProposal(0);
            expect(proposal.description).to.equal("Proposal 1");
            expect(proposal.voteCount).to.equal(0);
        });

        it("Should revert if a non-voter tries to add a proposal", async function () {
            await expect(
                voting.connect(addr2).addProposal("Non-voter proposal")
            ).to.be.revertedWith("You're not a voter");
        });

        it("Should revert if proposal description is empty", async function () {
            await expect(
                voting.connect(addr1).addProposal("")
            ).to.be.revertedWith("Vous ne pouvez pas ne rien proposer");
        });
    });

    // test vote
    describe("Voting Session", function () {
        beforeEach(async function () {
            await voting.addVoter(addr1.address);
            await voting.startProposalsRegistering();
            await voting.connect(addr1).addProposal("Proposal 1");
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
        });

        it("Should allow a voter to vote for a proposal", async function () {
            await voting.connect(addr1).setVote(0);
            const voter = await voting.getVoter(addr1.address);
            expect(voter.hasVoted).to.be.true;
            expect(voter.votedProposalId).to.equal(0);
            const proposal = await voting.getOneProposal(0);
            expect(proposal.voteCount).to.equal(1);
        });

        it("Should revert if a voter votes twice", async function () {
            await voting.connect(addr1).setVote(0);
            await expect(
                voting.connect(addr1).setVote(0)
            ).to.be.revertedWith("You have already voted");
        });

        it("Should revert if voting session is not active", async function () {
            await voting.endVotingSession();
            await expect(
                voting.connect(addr1).setVote(0)
            ).to.be.revertedWith("Voting session havent started yet");
        });
    });

    
    // test fin vote
    describe("Tallying Votes", function () {
        beforeEach(async function () {
            await voting.addVoter(addr1.address);
            await voting.startProposalsRegistering();
            await voting.connect(addr1).addProposal("Proposal 1");
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
            await voting.connect(addr1).setVote(0);
            await voting.endVotingSession();
        });

        it("Should tally votes and determine the winning proposal", async function () {
            await voting.tallyVotes();
            const winningProposalID = await voting.winningProposalID();
            expect(winningProposalID).to.equal(0); // Proposal 1 should win since it has the only vote
        });

        it("Should revert if tallying is called before voting ends", async function () {
            await voting.startProposalsRegistering();
            await expect(voting.tallyVotes()).to.be.revertedWith(
                "Current status is not voting session ended"
            );
        });
    });
});
