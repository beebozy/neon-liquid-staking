

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const wsolAddress= "0xc7Fc9b46e479c5Cb42f6C458D1881e55E6B7986c";
const usdcAddress="0x512E48836Cd42F3eB6f50CEd9ffD81E0a7F15103";




module.exports = buildModule("LiquidStakingModule",(m)=>{

    const wsolToken = m.getParameter("wsolToken",wsolAddress);
    const usdcToken =m.getParameter("memeToken",usdcAddress);

    const stakingContract = m.contract("LiquidStaking",[wsolToken,usdcToken]);

    return {stakingContract};
})


// const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// // Replace these with the actual token contract addresses used in the constructor
// const addressA = "0x..."; // Address for Token A (L)
// const addressB = "0x..."; // Address for Token B ()

// module.exports = buildModule("exampleContractModule", (m) => {
//   // Define constructor parameters using Ignition's parameter system
//   const aToken = m.getParameter("aToken", addressA);
//   const bToken = m.getParameter("bToken", addressB);

//   // Deploy the LiquidStaking contract with constructor arguments aToken and bToken
//   const exampleContract = m.contract("LiquidStaking", [aToken, bToken]);

//   // Export the deployed contract for use in other modules or scripts
//   return { exampleContract };
// });
