const fs = require("fs");
const hardhat = require("hardhat");

async function main() {
    const Factory = await ethers.getContractFactory("Factory");
    const factory = await Factory.deploy();

    const fArtifact = await hardhat.artifacts.readArtifact("Factory");
    const ieArtifact = await hardhat.artifacts.readArtifact("IElection");
    const cfArtifact = await hardhat.artifacts.readArtifact("ICrowdfunding")

    await fs.writeFileSync("./src/address.json", JSON.stringify({
        Factory: {
            address: factory.address,
            abi: fArtifact.abi,
        },
        IElection: {
            abi: ieArtifact.abi,
        },
        ICrowdfunding: {
            abi: cfArtifact.abi,
        }
    }, null, 2), function (err) {
        console.log("Can't write to file" + err)
    })

    console.log("Factory deployed to:", factory.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });