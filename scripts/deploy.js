const fs = require("fs");
const hardhat = require("hardhat");

async function main() {
    const ElectionFactory = await ethers.getContractFactory("ElectionFactory");
    const electionFactory = await ElectionFactory.deploy();

    const CrowdfundingFactory = await ethers.getContractFactory("CrowdfundingFactory");
    const crowdfundingFactory = await CrowdfundingFactory.deploy();

    const RockPaperScissorsFactory = await ethers.getContractFactory("RockPaperScissorsFactory");
    const rpsFactory = await RockPaperScissorsFactory.deploy();

    const eFactoryArtifact = await hardhat.artifacts.readArtifact("ElectionFactory");
    const cfFactoryArtifact = await hardhat.artifacts.readArtifact("CrowdfundingFactory");
    const rpsFactoryArtifact = await hardhat.artifacts.readArtifact("RockPaperScissorsFactory");

    const ieArtifact = await hardhat.artifacts.readArtifact("Election");
    const cfArtifact = await hardhat.artifacts.readArtifact("Crowdfunding");
    const rpsArtifact = await hardhat.artifacts.readArtifact("RockPaperScissors");

    await fs.writeFileSync("./src/address.json", JSON.stringify({
        ElectionFactory: {
            address: electionFactory.address,
            abi: eFactoryArtifact.abi,
        },
        CrowdfundingFactory: {
            address: crowdfundingFactory.address,
            abi: cfFactoryArtifact.abi,
        },
        RockPaperScissorsFactory: {
            address: rpsFactory.address,
            abi: rpsFactoryArtifact.abi,
        },
        Election: {
            abi: ieArtifact.abi,
        },
        Crowdfunding: {
            abi: cfArtifact.abi,
        },
        RockPaperScissors: {
            abi: rpsArtifact.abi,
        }
    }, null, 2), function (err) {
        console.log("Can't write to file" + err)
    })

    console.log("ElectionFactory deployed to:", electionFactory.address);
    console.log("CrowdfundingFactory deployed to:", crowdfundingFactory.address);
    console.log("RockPaperScissorsFactory deployed to:", rpsFactory.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });