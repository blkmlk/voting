let Election = artifacts.require('Election');

module.exports = async function (_deployer, _network, _accounts) {
  expiresIn = 2 * 60; // 10 minutes

  _deployer.deploy(Election, _accounts[0], 'Test Election', expiresIn).then(instance => {
    instance.addCandidates([{
      name: "John",
      surname: "Wick",
      imageValue: "value-1",
      votes: 0,
      active: true
    },
    {
      name: "Michael",
      surname: "Freeman",
      imageValue: "value-2",
      votes: 0,
      active: true
    }], { from: _accounts[0] })
  });


};
