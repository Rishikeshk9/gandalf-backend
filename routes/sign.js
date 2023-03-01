// run this script with `node main.js`
// see your transaction at `https://testnet.flowscan.org/transaction/YOUR_TX_ID`

const fcl = require("@onflow/fcl");
const t = require("@onflow/types");
const { authorizationFunction } = require("../helpers/authorization.js");
const { encrypt, decrypt } = require("../helpers/cipher.js");

var express = require("express");
var router = express.Router();

/* GET users listing. */
router.get("/", function (req, res, next) {
  sendTx();
  res.send("respond with a resource");
});

fcl.config().put("accessNode.api", "https://rest-testnet.onflow.org");
//fcl.authenticate();
fcl.proposer(authorizationFunction),
  fcl.payer(authorizationFunction),
  fcl.authorizations([authorizationFunction]),
  fcl.limit(50),
  function makeid(length) {
    var result = "";
    var characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };

const sendTx = async () => {
  //ENCRYPTION
  //   console.log("Sending Tx");
  //   let encryptedData = encrypt("FLIPKArT");
  //   console.log(
  //     "IV :",
  //     encryptedData.iv,
  //     "EncryptedText:",
  //     encryptedData.encryptedData
  //   );
  //DECRYPTION
  //   let decryptedData = decrypt(encryptedData);
  //   console.log("DecryptedText:", decryptedData);
  //   let apiKey = makeid(5).toString();
  //   console.log(apiKey);
  const transactionId = await fcl.mutate({
    cadence: `
      import Example from 0xe268b51b5dd5a580

transaction {

    prepare(acct : AuthAccount)
    {
    acct.save(<- Example.createProfile(name: "Rushikesh", email: "orion@gmail.com"), to: /storage/Profile)

     
    }
}
            `,
    proposer: authorizationFunction,
    payer: authorizationFunction,
    authorizations: [authorizationFunction],
    limit: 50,
  });

  const transaction = await fcl.tx(transactionId).onceSealed();
  console.log(transaction);

  //FOR FETCHING
  //   const result = await fcl.query({
  //     cadence: `
  //     import AssetControl2 from 0xe268b51b5dd5a580
  //     import FlowToken from 0x7e60df042a9c0868

  //     pub fun main(address : Address): AnyStruct {
  //       let acct = getAccount(address)

  //       return acct.borrow<&AssetControl2.Admin>(from: AssetControl2.gandalfPath)!.getCompanyData("BzBDs")

  //     }
  //       `,
  //     args: (arg, t) => [
  //       arg("0xe268b51b5dd5a580", t.Address), // addr: Address
  //     ],
  //   });
  //   console.log(result);
};

module.exports = router;
