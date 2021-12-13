var ethers = require('ethers');

const getEthers = () =>
    new Promise((resolve, reject) => {
        // Wait for loading completion to avoid race conditions with web3 injection timing.
        window.addEventListener("load", async () => {
            // Modern dapp browsers...
            if (window.ethereum) {
                console.log(window.ethereum.host);
                const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
                try {
                    await window.ethereum.request({ method: 'eth_requestAccounts' })
                    await provider.send("eth_requestAccounts", []);
                    resolve(provider);
                } catch (error) {
                    reject(error);
                }
            }
        });
    });

export default getEthers;