const aes = require("./aes");
const ecdh = require("./ecdh");

const AES_CHUNK_SIZE = 16

function crypto_pkcs7CalculatePaddedSize(data, data_size){
  return data_size + (AES_CHUNK_SIZE - data_size % AES_CHUNK_SIZE);
}

function crypto_pkcs7CalculateUnpaddedSize(data, data_size){
  var padding = data[data_size - 1];
  if (padding > 16 || padding < 1) {
      return data_size;
  }
  return data_size - padding;
}

function crypto_aesEncrypt(data, data_size, key, key_size, out){
  var key_schedule = new Uint32Array(60)
  var enc_buf = new Uint32Array(128);
  let pos = 0
  let rest = data_size;
  aes.aes_key_setup(key, key_schedule, 256);
  while(rest > 0) {
    aes.aes_encrypt(data, pos, enc_buf, key_schedule, 256);
    for (var i = pos; i < pos + AES_CHUNK_SIZE; i++){
      out[i] = enc_buf[i - pos]
    }
    rest -= AES_CHUNK_SIZE;
    pos += AES_CHUNK_SIZE;
  }
}

function crypto_aesDecrypt(encrypted_data, encrypted_data_size, key, key_size, out) {
  var key_schedule = new Uint32Array(60)
  var enc_buf = new Uint32Array(128);
  let pos = 0;
  let rest = encrypted_data_size;
  
  aes.aes_key_setup(key, key_schedule, 256);
  while(rest > 0) {        
      aes.aes_decrypt(encrypted_data, pos, enc_buf, key_schedule, 256);
      for (var i = pos; i < pos + AES_CHUNK_SIZE; i++){
        out[i] = enc_buf[i - pos]
      }
      rest -= AES_CHUNK_SIZE;
      pos += AES_CHUNK_SIZE;
  }
}

function crypto_pkcs7pad(data, data_size, out){
  var padded_size = crypto_pkcs7CalculatePaddedSize(data, data_size)
  var padding = padded_size - data_size;
  _out = Uint8Array.from(data);
  for (var i = 0; i < data_size; i++){
    out[i] = _out[i];
  }
  for (var i = data_size; i < padded_size; i++){
    out[i] = padding
  }
  return padded_size
}

function crypto_pkcs7unpad(data, data_size, out){
  var unpadded_size = crypto_pkcs7CalculateUnpaddedSize(data, data_size)
  var padding = data_size - unpadded_size;
  _out = Uint8Array.from(data);
  for (var i = data_size; i < unpadded_size; i--){
    if (_out[out.length - i] != padding){
      return 0
    }    
  }
  for (var i = 0; i < unpadded_size; i++){
    out[i] = _out[i]
  }
  return unpadded_size
}


function crypto_sign(prv_key, pub_key, data, data_size, out){

  var privateKey = Uint8Array.from(Buffer.from(prv_key, 'hex'));
  var otherPubKey = Uint8Array.from(Buffer.from(pub_key, 'hex'));

  let shared_secret = new Uint8Array(ecdh.ECC_PUB_KEY_SIZE);
  ecdh.ecdh_shared_secret(privateKey, otherPubKey, shared_secret);

  var padded_data_size = crypto_pkcs7CalculatePaddedSize(data, data_size);
  let padded_data = new Uint8Array(padded_data_size);
  crypto_pkcs7pad(data, data_size, padded_data);
  let encrypted_data = new Uint8Array(padded_data_size);
  crypto_aesEncrypt(padded_data, padded_data_size, shared_secret, ecdh.ECC_PUB_KEY_SIZE, encrypted_data);

  //out = Uint8Array.from(encrypted_data)
  for (var i = 0; i < encrypted_data.length; i++){
    out[i] = encrypted_data[i]
  }

  return padded_data_size

}

function crypto_unsign(prv_key, pub_key, encrypted_data, encrypted_data_size, out){
  var privateKey = Uint8Array.from(Buffer.from(prv_key, 'hex'));
  var otherPubKey = Uint8Array.from(Buffer.from(pub_key, 'hex'));

  let shared_secret = new Uint8Array(ecdh.ECC_PUB_KEY_SIZE);
  ecdh.ecdh_shared_secret(privateKey, otherPubKey, shared_secret);
  let decrypted_data = new Uint8Array(encrypted_data_size);
  crypto_aesDecrypt(encrypted_data, encrypted_data_size, shared_secret, ecdh.ECC_PUB_KEY_SIZE, decrypted_data);
  var unpadded_data_size = crypto_pkcs7CalculateUnpaddedSize(decrypted_data, encrypted_data_size);
  var ret = crypto_pkcs7unpad(decrypted_data, encrypted_data_size, out);

  return ret;
}

module.exports = {
  crypto_unsign: crypto_unsign,
  crypto_sign: crypto_sign,
  crypto_pkcs7CalculatePaddedSize: crypto_pkcs7CalculatePaddedSize
}