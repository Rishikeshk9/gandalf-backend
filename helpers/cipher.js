var CryptoJS = require("crypto-js");
function encrypt(text, cypherKey){
  let encryptedText = CryptoJS.AES.encrypt(text, cypherKey);
  encryptedText = encryptedText.toString();
  return encryptedText; 
}

function decrypt(text, cypherKey){
  const bytes  = CryptoJS.AES.decrypt(text, cypherKey);
  const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
  return decryptedText;
}

module.exports = {
  encrypt,
  decrypt,
};
