
const contract = artifacts.require("SmartContract");

module.exports = function (deployer) {
  deployer.deploy(contract);
};