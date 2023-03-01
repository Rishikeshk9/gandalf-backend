const { encrypt, decrypt } = require("./cipher");

function initialKeyCreation(address) {
  const random = Math.floor((Math.random() + 91821723) * 10000000);
  const x = String(address) + String(random);
  console.log("X in encryption", x);
  const y = process.env.PRIVATE_KEY;
  const z = encrypt(x, y);
  return z;
}

function encryptedDataCreation(key, data) {
  const y = process.env.PRIVATE_KEY;
  const z = key;
  const x = decrypt(z, y);
  console.log("X in decryption", x);
  const q = data;
  const p = encrypt(q, x);
  return p;
}

function dataRead(z, p) {
  const y = process.env.PRIVATE_KEY;
  const x = decrypt(z, y);
  console.log("X in decryption", x);
  const q = decrypt(p, x);
  return q;
}

function encryptProtocolData(data) {
  const y = process.env.PRIVATE_KEY;
  const encryptedProtocolData = encrypt(data, y);
  return encryptedProtocolData;
}

function decryptProtocolData(data) {
  const y = process.env.PRIVATE_KEY;
  const decryptedProtocolData = decrypt(data, y);
  return decryptedProtocolData;
}

function makeid(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

module.exports = {
  initialKeyCreation,
  encryptedDataCreation,
  dataRead,
  makeid,
  encryptProtocolData,
  decryptProtocolData,
};
