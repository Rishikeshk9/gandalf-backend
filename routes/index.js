var express = require("express");
const fcl = require("@onflow/fcl");
const t = require("@onflow/types");
const {
  initialKeyCreation,
  encryptedDataCreation,
  dataRead,
  makeid,
  encryptProtocolData,
  decryptProtocolData,
} = require("../helpers/gandalfService");
const { authorizationFunction } = require("../helpers/authorization");
const { encrypt } = require("../helpers/cipher");
var router = express.Router();
const apiKeyLength = 10;
fcl
  .config()
  .put("accessNode.api", "https://rest-testnet.onflow.org")
  .put("flow.network", "testnet");
//fcl.authenticate();
fcl.proposer(authorizationFunction),
  fcl.payer(authorizationFunction),
  fcl.authorizations([authorizationFunction]),
  fcl.limit(50);
/* GET home page. */
router.post("/", function (req, res, next) {
  const z = testEncryption(req.body);
  // res.render('index', { title: 'Express' });
  res.send(z);
});

router.post("/getkey", async function (req, res, next) {
  console.log(req.body);
  try {
    let apiKey, decryptedName, decryptedEmail;
    let { walletAddress, signature } = req.body;
    signature = JSON.parse(req.body.signature);
    const verified = signature
      ? await fcl.AppUtils.verifyUserSignatures(
          Buffer.from("Requesting API Key for " + walletAddress).toString(
            "hex"
          ),
          [signature]
        )
      : false;
    const address = signature?.addr || null;
    console.log("This should be true: ", walletAddress === address);
    // query with public capability to read getCompanyApiKey(email)
    if (verified && walletAddress === address) {
      console.log("inside verified");
      apiKey = await fcl.query({
        cadence: `
        import AssetControl11 from 0x88d8816248a970ff
        pub fun main(address: Address): AnyStruct? {
          let ref = getAccount(0x88d8816248a970ff).getCapability<&{AssetControl11.Public}>(AssetControl11.gandalfPublic).borrow()!.getCompanyApikey(address)
          return ref
        }
      `,
        args: (arg, t) => [
          arg(address, t.Address), // addr: Address
        ],
      });
      console.log("apiKey", apiKey);
      if (apiKey != "No Company for this wallet address") {
        // fcl.query for getCompanyData(apiKey)
        const queryCompanyData = await fcl.query({
          cadence: `
          import AssetControl11 from 0x88d8816248a970ff
          pub fun main(apiKey: String): AnyStruct? {
            let ref = getAccount(0x88d8816248a970ff).getCapability<&{AssetControl11.Public}>(AssetControl11.gandalfPublic).borrow()?.getCompanyData(apiKey)
            return ref
          }
        `,
          args: (arg, t) => [
            arg(apiKey, t.String), // addr: Address
          ],
        });
        console.log("queryCompanyData", queryCompanyData);
        if (queryCompanyData?.name && queryCompanyData?.email) {
          //decrypt data
          decryptedName = decryptProtocolData(queryCompanyData.name);
          decryptedEmail = decryptProtocolData(queryCompanyData.email);
          console.log("decryptedName", decryptedName);
          console.log("decryptedEmail", decryptedEmail);
        }
        res.json({
          data: req.body,
          apiKey: apiKey,
          status: 200,
          msg: "success",
          companyName: decryptedName,
          email: decryptedEmail,
        });
      } else {
        res.json({
          data: req.body,
          status: 404,
          msg: "No Company found for this wallet address",
        });
      }
    } else {
      res.json({
        data: req.body,
        status: 401,
        msg: "Unauthorized user",
      });
    }
  } catch (error) {
    console.log("error", error);
    res.json({
      error: error,
      data: req.body,
      status: 500,
      msg: "internal server error",
    });
  }
});

router.post("/createkey", async function (req, res, next) {
  console.log(req.body);
  try {
    let apiKey;
    let { companyName, email, walletAddress, signature } = req.body;
    const encryptedEmail = encryptProtocolData(email);
    signature = JSON.parse(req.body.signature);
    const verified = signature
      ? await fcl.AppUtils.verifyUserSignatures(
          Buffer.from("Creating API Key for " + companyName).toString("hex"),
          [signature]
        )
      : false;
    console.log("verified", verified);
    const address = signature?.addr || null;
    console.log("wallet: ", walletAddress, "address: ", address);
    // query with public capability to read getCompanyApiKey(email)
    // convert req.body.email @ to /@
    if (verified && walletAddress === address) {
      console.log("inside verified");
      apiKey = await fcl.query({
        cadence: `
        import AssetControl11 from 0x88d8816248a970ff
        pub fun main(address: Address): AnyStruct? {
          let ref = getAccount(0x88d8816248a970ff).getCapability<&{AssetControl11.Public}>(AssetControl11.gandalfPublic).borrow()!.getCompanyApikey(address)
          return ref
        }
      `,
        args: (arg, t) => [
          arg(address, t.Address), // addr: Address
        ],
      });
      console.log("apiKey: ", apiKey);
      if (apiKey != "No Company for this wallet address") {
        res.json({
          data: req.body,
          apiKey: apiKey,
          status: "Key Already present cannot create",
        });
      } else {
        apiKey = makeid(apiKeyLength);
        const regeneratedApiKeyFlag = false;
        const encryptedName = encryptProtocolData(companyName);
        console.log("encryptedProtocol data", apiKey, encryptedEmail);

        const queryApiKey = await fcl.query({
          cadence: `
          import AssetControl11 from 0x88d8816248a970ff
          pub fun main(apiKey: String): AnyStruct? {
            let ref = getAccount(0x88d8816248a970ff).getCapability<&{AssetControl11.Public}>(AssetControl11.gandalfPublic).borrow()?.getCompanyData(apiKey)
            return ref
          }
        `,
          args: (arg, t) => [
            arg(apiKey, t.String), // addr: Address
          ],
        });
        console.log("queryApiKey", queryApiKey);
        if (queryApiKey != null) {
          apiKey = makeid(apiKeyLength);
          regeneratedApiKeyFlag = true;
        }

        if (
          !queryApiKey ||
          queryApiKey == null ||
          regeneratedApiKeyFlag === true
        ) {
          const transactionId = await fcl.mutate({
            cadence: `import AssetControl11 from 0x88d8816248a970ff
            transaction(apiKey: String, name: String, email: String, address: Address) {
                prepare(acct : AuthAccount)
                  {
                    acct.borrow<&{AssetControl11.Admin}>(from: AssetControl11.gandalfPath)!
                    .setCompanyData(apiKey, name, email, address)
                  }
                }`,
            args: (arg, t) => [
              arg(apiKey, t.String),
              arg(encryptedName, t.String),
              arg(encryptedEmail, t.String),
              arg(address, t.Address),
            ],
            proposer: authorizationFunction,
            payer: authorizationFunction,
            authorizations: [authorizationFunction],
            limit: 50,
          });
          const transaction = await fcl.tx(transactionId).onceSealed();
          console.log(transaction);
          res.json({
            data: req.body,
            transaction: transaction,
            apiKey: apiKey,
            status: "success",
          });
        } else {
          res.json({
            data: req.body,
            apiKey: apiKey,
            status: "failed",
          });
        }
      }
    } else {
      res.json({ data: req.body, status: "some error" });
    }
  } catch (error) {
    console.log("error", error);
    res.json({ error: error, data: req.body, status: "failed" });
  }
});

// create a post /addUserData route to add user data and value to the flow blockchain using fcl.mutate
router.post("/createUser", async function (req, res, next) {
  console.log("req.body", req.body);
  try {
    let { apiKey, name, email, signature, walletAddress } = req.body;
    signature = JSON.parse(req.body.signature);
    const verified = signature
      ? await fcl.AppUtils.verifyUserSignatures(
          Buffer.from("Registering User " + name).toString("hex"),
          [signature]
        )
      : false;
    console.log("verified", verified);
    const address = signature?.addr || null;
    if (verified && walletAddress === address) {
      const z = initialKeyCreation(walletAddress);
      email = encryptProtocolData(email);
      name = encryptProtocolData(name);

      let scriptCdc = `import AssetControl11 from 0x88d8816248a970ff
      transaction {
          prepare(acct : AuthAccount)
            { 
              acct.save(<- AssetControl11.new(), to: /storage/AssetControl11_${apiKey})
              acct.link<&AssetControl11.Asset{AssetControl11.AssetPublic}>(/public/AssetControl11_${apiKey}, target: /storage/AssetControl11_${apiKey})
              acct.link<&AssetControl11.Asset{AssetControl11.Owner}>(/private/AssetControl11_${apiKey}, target: /storage/AssetControl11_${apiKey})
              acct.borrow<&{AssetControl11.Owner}
              >(from: /storage/AssetControl11_${apiKey})!
              .setUserData("${name}", "${email}", "${z}")
            }
          }`;
      try {
        const transactionId = await fcl.mutate({
          cadence: `import AssetControl11 from 0x88d8816248a970ff
        transaction {
            prepare(acct : AuthAccount)
              { 
                acct.borrow<&{AssetControl11.Admin}
                >(from: AssetControl11.gandalfPath)!
                .addUsersToOrganisation("${apiKey}", ${address})
              }
            }`,
          proposer: authorizationFunction,
          payer: authorizationFunction,
          authorizations: [authorizationFunction],
          limit: 50,
        });
        const transaction = await fcl.tx(transactionId).onceSealed();
        console.log(transaction);
      } catch (error) {
        console.log("Already Registered Ignore warning");
      }
      res.json({
        data: req.body,
        scriptCadence: scriptCdc,
        status: 200,
        msg: "success",
      });
    } else {
      res.json({ data: req.body, status: 401, msg: "Unauthorized" });
    }
  } catch (error) {
    console.log(error);
    res.json({
      error: error,
      data: req.body,
      status: 500,
      msg: "Server Error",
    });
  }
});

router.post("/getUserData", async function (req, res, next) {
  console.log("req.body", req.body);
  try {
    // verify signature
    let { apiKey, signature, walletAddress, field } = req.body;
    signature = JSON.parse(req.body.signature);
    const verified = signature
      ? await fcl.AppUtils.verifyUserSignatures(
          Buffer.from("Getting User Data from " + apiKey).toString("hex"),
          [signature]
        )
      : false;
    console.log("verified", verified);
    const address = signature?.addr || null;
    if (verified && walletAddress === address) {
      const userData = await fcl.query({
        cadence: `import AssetControl11 from 0x88d8816248a970ff
        pub fun main(): AnyStruct? {
          let ref = getAccount(${address}).getCapability<&AssetControl11.Asset{AssetControl11.AssetPublic}>(/public/AssetControl11_${apiKey}).borrow()
          return ref.getUserData()
        }`,
      });
      console.log("userData", userData);
      const z = userData ? userData.key : null;
      const fieldValue = await fcl.query({
        cadence: `import AssetControl11 from 0x88d8816248a970ff
        pub fun main(): AnyStruct? {
          let ref = getAccount(${address}).getCapability<&AssetControl11.Asset{AssetControl11.AssetPublic}>(/public/AssetControl11_${apiKey}).borrow()
          return ref.getVault("${field}")
        }`,
      });
      console.log("fieldValue", fieldValue);
      const q = dataRead(z, fieldValue);
      res.json({
        data: req.body,
        userFieldValue: q,
        status: 200,
        msg: "success",
      });
    } else {
      res.json({ data: req.body, status: 401, msg: "Unauthorized" });
    }
  } catch (error) {
    console.log(error);
    res.json({
      error: error,
      data: req.body,
      status: 500,
      msg: "Server Error",
    });
  }
});

// create a post /addUserData route to add user data and value to the flow blockchain using fcl.mutate
router.post("/addUserData", async function (req, res, next) {
  console.log("req.body", req.body);
  try {
    let { apiKey, signature, walletAddress, field, value } = req.body;
    signature = JSON.parse(req.body.signature);
    const verified = signature
      ? await fcl.AppUtils.verifyUserSignatures(
          Buffer.from("Adding User Data from " + walletAddress).toString("hex"),
          [signature]
        )
      : false;
    console.log("verified", verified);
    const address = signature?.addr || null;
    if (verified && walletAddress === address) {
      //fcl.query to check the user is registered with the company or not
      const usersOfOrganisation = await fcl.query({
        cadence: `import AssetControl11 from 0x88d8816248a970ff
        pub fun main(): AnyStruct? {
          let ref = getAccount(0x88d8816248a970ff).getCapability<&{AssetControl11.Public}>(AssetControl11.gandalfPublic).borrow()
          ?? panic("Could not borrow reference to the owner")
          return ref.getUsersOfOrganisation("${apiKey}")
        }`,
      });
      console.log("usersOfOrganisation", usersOfOrganisation);
      if (!usersOfOrganisation.includes(address)) {
        res.json({
          data: req.body,
          status: 505,
          msg: "User is not registered in the company list",
        });
      }
      //fcl.query for retrieving the key from the /public/AssetControl11_${apiKey} path using getUserData function
      const userData = await fcl.query({
        cadence: `import AssetControl11 from 0x88d8816248a970ff
        pub fun main(): AnyStruct? {
          let ref = getAccount(${walletAddress}).getCapability<&AssetControl11.Asset{AssetControl11.AssetPublic}>(/public/AssetControl11_${apiKey}).borrow()
          return ref?.getUserData()
        }`,
      });
      console.log("userData", userData);
      const z = userData ? userData.key : null;
      if (z) {
        let p = encryptedDataCreation(z, value);
        console.log("p: -> ", p);
        let scriptCdc = `import AssetControl11 from 0x88d8816248a970ff
        transaction {
            prepare(acct : AuthAccount)
              { 
                //acct.link<&AssetControl11.Asset{AssetControl11.Owner}>(/private/AssetControl11_${apiKey}, target: /storage/AssetControl11_${apiKey})
                acct.borrow<&{AssetControl11.Owner}
                >(from: /storage/AssetControl11_${apiKey})!
                .setVaultData("${field}", "${p}")
              }
            }`;
        res.json({
          data: req.body,
          scriptCadence: scriptCdc,
          status: 200,
          msg: "success",
        });
      } else {
        res.json({
          data: req.body,
          status: 403,
          msg: "No Key found in user Storage",
        });
      }
    } else {
      res.json({ data: req.body, status: 401, msg: "Unauthorized" });
    }
  } catch (error) {
    console.log(error);
    res.json({ error: error, data: req.body, status: "failed" });
  }
});

// create a post /addUserData route to add user data and value to the flow blockchain using fcl.mutate
router.post("/getUserDetail", async function (req, res, next) {
  console.log("req.body", req.body);
  try {
    let { apiKey, signature, walletAddress} = req.body;
    signature = JSON.parse(req.body.signature);
    const verified = signature
      ? await fcl.AppUtils.verifyUserSignatures(
          Buffer.from("Getting User Data for " + walletAddress).toString("hex"),
          [signature]
        )
      : false;
    console.log("verified", verified);
    const address = signature?.addr || null;
    if (verified && walletAddress === address) {
      //fcl.query to check the user is registered with the company or not
      const usersOfOrganisation = await fcl.query({
        cadence: `import AssetControl11 from 0x88d8816248a970ff
        pub fun main(): AnyStruct? {
          let ref = getAccount(0x88d8816248a970ff).getCapability<&{AssetControl11.Public}>(AssetControl11.gandalfPublic).borrow()
          ?? panic("Could not borrow reference to the owner")
          return ref.getUsersOfOrganisation("${apiKey}")
        }`,
      });
      console.log("usersOfOrganisation", usersOfOrganisation);
      if (!usersOfOrganisation.includes(address)) {
        res.json({
          data: req.body,
          status: 505,
          msg: "User is not registered in the company list",
        });
      }
      //fcl.query for retrieving the key from the /public/AssetControl11_${apiKey} path using getUserData function
      const userData = await fcl.query({
        cadence: `import AssetControl11 from 0x88d8816248a970ff
        pub fun main(): AnyStruct? {
          let ref = getAccount(${walletAddress}).getCapability<&AssetControl11.Asset{AssetControl11.AssetPublic}>(/public/AssetControl11_${apiKey}).borrow() ?? panic("Could not borrow reference to the owner")
          return ref.getUserData()
        }`,
      });
      console.log("userData", userData);
      const decryptedEmail = userData ? decryptProtocolData(userData.email) : null;
      const decryptedName = userData ? decryptProtocolData(userData.name) : null;
      const z = userData ? userData.key : null;

      const fieldValues = await fcl.query({
        cadence: `import AssetControl11 from 0x88d8816248a970ff
        pub fun main(): AnyStruct? {
          let ref = getAccount(${walletAddress}).getCapability<&AssetControl11.Asset{AssetControl11.AssetPublic}>(/public/AssetControl11_${apiKey}).borrow()?.getAllVault()
          return ref
        }`,
      });
      console.log("fieldValues", fieldValues);
      let vaultArray = [];
      // for loop in fieldValues JSON to decrypt the data 
      if (fieldValues) {
        for (const key in fieldValues) {
          if (fieldValues.hasOwnProperty(key)) {
            vaultArray.push({
              name: key,
              decrypted: z ? dataRead(z, fieldValues[key]) : null,
              value: fieldValues[key],
            });
          }
        }
      }
      console.log("vaultArray", vaultArray, );
      res.json({
        data: req.body,
        name: decryptedName,
        email: decryptedEmail,
        vault: vaultArray,
        status: 200,
        msg: "User Data retrieved successfully",
      })
    } else {
      res.json({ data: req.body, status: 401, msg: "Unauthorized" });
    }
  } catch (error) {
    console.log(error);
    res.json({ error: error, data: req.body, status: "failed" });
  }
});

function testEncryption(body) {
  const data = JSON.parse(body.data);
  console.log(data);
  const z = initialKeyCreation(body.address);
  const p = encryptedDataCreation(z, data?.password);
  console.log("P", p);
  const dataReadDecrypted = dataRead(z, p);
  console.log("dataReadDecrypted", dataReadDecrypted);
  return z;
}
module.exports = router;
