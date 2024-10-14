//SPDX-License-Identifier: 3.0

pragma solidity 0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Voting {

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    struct Proposal {
        string description;
        uint voteCount;
    }

    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    WorkflowStatus public workflowStatus;
    address public admin = msg.sender;
    Proposal[] public proposals;
    mapping(address => Voter) public voters; //whitelist d'electeurs identifiés par leur address
    uint public winningProposalId;
    

    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted(address voter, uint proposalId);

    constructor() {
        // Nous voulons que l'admin soit déja autorisé à voter
        voters[msg.sender] = Voter(true, false, 0); // enregistrement de l'admin
        emit VoterRegistered(msg.sender);
    }

    modifier onlyOwner() {
        
        require(msg.sender == admin, "only admin");
        _;
    }

    function registerVoter(address _voterAddress) external onlyOwner { //enregistrement electeurs

        require(workflowStatus == WorkflowStatus.RegisteringVoters, "registration is not open");
        require(!voters[_voterAddress].isRegistered, "already registered");
        voters[_voterAddress].isRegistered = true;
        emit VoterRegistered(_voterAddress);
    
    }

    function submitProposal(string memory _description) external {

        require(voters[msg.sender].isRegistered, "not allowed to submit a proposal");
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, 
        "Proposals registration is not open"); //on check si le voter est bien enregistré 
                                               //et si on a commencé a recupérer les propositions
        proposals.push(Proposal({
            description: _description,
            voteCount: 0
        }));
        emit ProposalRegistered(proposals.length); //on attribue l'Id du proposal à un nombre (de 1 à n)
    }

    function vote(uint _proposalId) external {
        require(voters[msg.sender].isRegistered, "not allowed to vote");
        require(!voters[msg.sender].hasVoted, "already voted");
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "not open");

        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedProposalId = _proposalId;
        proposals[_proposalId].voteCount += 1;

        emit Voted(msg.sender, _proposalId);
    }

    function tallyVotes() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionEnded, "Voting not finished");

        uint highestVoteCount = 0;
        for (uint i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > highestVoteCount) {
                highestVoteCount = proposals[i].voteCount;
                winningProposalId = i;
            }
        }
        workflowStatus = WorkflowStatus.VotesTallied;
    }

    function getWinner() external view returns (string memory winnerDescription) {
        require(workflowStatus == WorkflowStatus.VotesTallied, "Votes have not been tallied yet");
        winnerDescription = proposals[winningProposalId].description;
    }

    function startProposalRegistration() external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, "Cannot start proposal registration now");
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, workflowStatus);
    }

    function endProposalRegistration() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, "Proposal registration is not active");
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, workflowStatus);
    }

    function startVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationEnded, "Cannot start voting session now");
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationEnded, workflowStatus);
    }

    function endVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "Voting session is not active");
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, workflowStatus);
    }
}

